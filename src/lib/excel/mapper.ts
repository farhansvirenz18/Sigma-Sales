import { supabaseAdmin } from "@/lib/supabase/server";
import { ColumnMapping } from "@/types";
import { parseDate, toNumber } from "@/lib/utils/date";
import { getMonthName } from "@/lib/utils/format";

interface BundleItem {
  bundle_code: string;
  child_product_code: string;
  quantity: number;
}

interface RegionConfig {
  province_pattern: string;
  region: string;
}

interface PlatformConfig {
  source_pattern: string;
  target_platform: string;
  priority: number;
}

interface TransformContext {
  products: Map<string, { code: string; name: string }>;
  productPrices: Map<string, { product_code: string; platform: string; hpp: number }>;
  bundleItems: Map<string, BundleItem[]>;
  regionConfig: RegionConfig[];
  platformConfig: PlatformConfig[];
  mappings: ColumnMapping[];
}

let cachedContext: TransformContext | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000;

export function clearTransformCache(): void {
  cachedContext = null;
  cacheTimestamp = 0;
}

export async function loadTransformContext(): Promise<TransformContext> {
  const now = Date.now();
  if (cachedContext && now - cacheTimestamp < CACHE_TTL) return cachedContext;

  const [productsRes, pricesRes, mappingsRes, bundlesRes, regionRes, platformRes] =
    await Promise.all([
      supabaseAdmin.from("products").select("code, name").eq("is_active", true),
      supabaseAdmin.from("product_prices").select("*"),
      supabaseAdmin.from("column_mappings").select("*"),
      supabaseAdmin.from("bundle_items").select("*"),
      supabaseAdmin.from("region_config").select("*").eq("is_active", true),
      supabaseAdmin.from("platform_config").select("*").eq("is_active", true).order("priority", { ascending: false }),
    ]);

  const products = new Map<string, { code: string; name: string }>();
  for (const p of productsRes.data || []) {
    products.set(p.code, p);
  }

  const productPrices = new Map<string, { product_code: string; platform: string; hpp: number }>();
  for (const p of pricesRes.data || []) {
    const key = `${p.product_code}|${p.platform}`;
    productPrices.set(key, p);
  }

  const bundleItems = new Map<string, BundleItem[]>();
  for (const b of bundlesRes.data || []) {
    const existing = bundleItems.get(b.bundle_code) || [];
    existing.push(b);
    bundleItems.set(b.bundle_code, existing);
  }

  cachedContext = {
    products,
    productPrices,
    bundleItems,
    regionConfig: (regionRes.data as RegionConfig[]) || [],
    platformConfig: (platformRes.data as PlatformConfig[]) || [],
    mappings: (mappingsRes.data as ColumnMapping[]) || [],
  };
  cacheTimestamp = Date.now();

  return cachedContext;
}

export function applyTransform(
  data: Record<string, unknown>,
  mapping: ColumnMapping,
  ctx: TransformContext
): unknown {
  const rule = mapping.transform_rule;
  const sourceValue = data[mapping.source_column];

  switch (rule.type) {
    case "direct":
      return sourceValue;

    case "date_format":
      return parseDate(String(sourceValue || ""));

    case "number":
      return toNumber(sourceValue);

    case "lookup": {
      const record = ctx.products.get(String(sourceValue));
      if (record && rule.field) {
        return (record as Record<string, unknown>)[rule.field] || sourceValue;
      }
      return sourceValue;
    }

    case "lookup_hpp": {
      const platform = resolvePlatform(data, ctx);
      const priceKey = `${sourceValue}|${platform}`;
      const price = ctx.productPrices.get(priceKey);
      return price ? price.hpp : 0;
    }

    case "map":
      if (rule.mapping && sourceValue !== null && sourceValue !== undefined) {
        return rule.mapping[String(sourceValue)] || sourceValue;
      }
      return sourceValue;

    case "region_map":
      return mapRegion(String(data.ProvinsiCustomer || ""), ctx);

    case "concat":
      if (rule.fields && rule.separator) {
        return rule.fields
          .map((f) => String(data[f] || ""))
          .join(rule.separator);
      }
      return sourceValue;

    case "formula":
      return evaluateFormula(rule.expression || "", data);

    default:
      return sourceValue;
  }
}

export function resolvePlatform(data: Record<string, unknown>, ctx?: TransformContext): string {
  const kanal = String(data.Kanal || "");
  const platform = String(data.Platform || "");
  const combined = `${kanal} ${platform}`.toUpperCase();

  // Use DB config if available
  if (ctx && ctx.platformConfig.length > 0) {
    for (const config of ctx.platformConfig) {
      if (combined.includes(config.source_pattern.toUpperCase())) {
        return config.target_platform;
      }
    }
  }

  // Fallback to defaults
  if (combined.includes("SHOPEE")) return "SHOPEE";
  if (combined.includes("TIKTOK")) return "TIKTOK SHOP";
  return "WEB";
}

function mapRegion(provinsi: string, ctx?: TransformContext): string {
  // Use DB config if available
  if (ctx && ctx.regionConfig.length > 0) {
    for (const config of ctx.regionConfig) {
      if (provinsi.includes(config.province_pattern.replace(/%/g, ""))) {
        return config.region;
      }
    }
  }

  // Fallback to defaults
  const fallback: Record<string, string> = {
    "Jawa Timur": "JAWA",
    "Jawa Barat": "JAWA",
    "Jawa Tengah": "JAWA",
    "DKI Jakarta": "JAWA",
    "Banten": "JAWA",
    "Sumatera": "SUMATERA",
    "Kalimantan": "KALIMANTAN",
    "Sulawesi": "SULAWESI",
    "Bali": "BALI",
  };

  for (const [key, region] of Object.entries(fallback)) {
    if (provinsi.includes(key)) return region;
  }
  return "OTHER";
}

function evaluateFormula(expression: string, data: Record<string, unknown>): number {
  try {
    let formula = expression;
    for (const [key, value] of Object.entries(data)) {
      const numValue = toNumber(value);
      formula = formula.replace(new RegExp(`\\b${key}\\b`, "g"), String(numValue));
    }
    const result = new Function(`return ${formula}`)();
    return Number(result) || 0;
  } catch {
    return 0;
  }
}

/**
 * Check if a product code is a bundle and return its child items.
 * If not a bundle, returns a single-item array with the original code.
 */
export function resolveProduct(
  productCode: string,
  ctx: TransformContext
): { code: string; quantity: number }[] {
  const bundleItems = ctx.bundleItems.get(productCode);
  if (bundleItems && bundleItems.length > 0) {
    return bundleItems.map((item) => ({
      code: item.child_product_code,
      quantity: item.quantity,
    }));
  }
  return [{ code: productCode, quantity: 1 }];
}

/**
 * Get HPP for a product, handling bundles by summing child HPPs.
 */
export function resolveHPP(
  productCode: string,
  platform: string,
  ctx: TransformContext
): number {
  const bundleItems = ctx.bundleItems.get(productCode);
  if (bundleItems && bundleItems.length > 0) {
    let totalHPP = 0;
    for (const item of bundleItems) {
      const priceKey = `${item.child_product_code}|${platform}`;
      const price = ctx.productPrices.get(priceKey);
      totalHPP += price ? price.hpp * item.quantity : 0;
    }
    return totalHPP;
  }

  const priceKey = `${productCode}|${platform}`;
  const price = ctx.productPrices.get(priceKey);
  return price ? price.hpp : 0;
}

export function applyFinanceTransforms(
  rawRows: { id: number; raw_data: Record<string, unknown>; source_file: string }[],
  ctx: TransformContext
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (const row of rawRows) {
    const productCode = String(row.raw_data.ProductCode || "");
    const platform = resolvePlatform(row.raw_data, ctx);
    const resolvedProducts = resolveProduct(productCode, ctx);

    for (const prod of resolvedProducts) {
      const financeRow: Record<string, unknown> = {};

      const financeMappings = ctx.mappings.filter(
        (m) => m.target_table === "finance" && m.source_file === row.source_file
      );

      for (const mapping of financeMappings) {
        if (mapping.target_column === "Produk Name") {
          const productRecord = ctx.products.get(prod.code);
          financeRow["Produk Name"] = productRecord?.name || prod.code;
        } else if (mapping.target_column === "Jumlah") {
          financeRow["Jumlah"] = toNumber(row.raw_data.Quantity) * prod.quantity;
        } else if (mapping.target_column === "HPP Sigma") {
          financeRow["HPP Sigma"] = resolveHPP(prod.code, platform, ctx);
        } else {
          financeRow[mapping.target_column] = applyTransform(row.raw_data, mapping, ctx);
        }
      }

      // Ensure HPP and Total Bayar are set
      if (!financeRow["HPP Sigma"]) {
        financeRow["HPP Sigma"] = resolveHPP(prod.code, platform, ctx);
      }
      financeRow["Total Bayar"] = toNumber(row.raw_data.Totalperline);

      result.push(financeRow);
    }
  }

  return result;
}

export function applyMarketingTransforms(
  rawRows: { id: number; raw_data: Record<string, unknown>; source_file: string }[],
  ctx: TransformContext
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (const row of rawRows) {
    const productCode = String(row.raw_data.ProductCode || "");
    const platform = resolvePlatform(row.raw_data, ctx);
    const resolvedProducts = resolveProduct(productCode, ctx);

    for (const prod of resolvedProducts) {
      const marketingRow: Record<string, unknown> = {};

      const marketingMappings = ctx.mappings.filter(
        (m) => m.target_table === "marketing" && m.source_file === row.source_file
      );

      for (const mapping of marketingMappings) {
        if (mapping.target_column === "Produk") {
          const productRecord = ctx.products.get(prod.code);
          marketingRow["Produk"] = productRecord?.name || prod.code;
        } else if (mapping.target_column === "Jumlah") {
          marketingRow["Jumlah"] = toNumber(row.raw_data.Quantity) * prod.quantity;
        } else if (mapping.target_column === "HPP") {
          marketingRow["HPP"] = resolveHPP(prod.code, platform, ctx);
        } else {
          marketingRow[mapping.target_column] = applyTransform(row.raw_data, mapping, ctx);
        }
      }

      // Compute Tahun/Bulan from Date
      const dateStr = parseDate(String(row.raw_data.Date || ""));
      const date = new Date(dateStr);
      marketingRow["Tahun"] = date.getFullYear();
      marketingRow["Bulan"] = getMonthName(date.getMonth());

      // Ensure HPP and SKU are set
      if (!marketingRow["HPP"]) {
        marketingRow["HPP"] = resolveHPP(prod.code, platform, ctx);
      }
      marketingRow["SKU"] = prod.code;

      result.push(marketingRow);
    }
  }

  return result;
}
