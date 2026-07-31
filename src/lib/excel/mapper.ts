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

  if (productsRes.error) throw new Error(`Failed to load products: ${productsRes.error.message}`);
  if (pricesRes.error) throw new Error(`Failed to load product_prices: ${pricesRes.error.message}`);
  if (mappingsRes.error) throw new Error(`Failed to load column_mappings: ${mappingsRes.error.message}`);
  if (bundlesRes.error) throw new Error(`Failed to load bundle_items: ${bundlesRes.error.message}`);
  if (regionRes.error) throw new Error(`Failed to load region_config: ${regionRes.error.message}`);
  if (platformRes.error) throw new Error(`Failed to load platform_config: ${platformRes.error.message}`);

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
      return mapRegion(String(data[rule.input || "ProvinsiCustomer"] || ""), ctx);

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
      console.warn(`Unknown transform type: ${rule.type} for column ${mapping.target_column}`);
      return sourceValue;
  }
}

export function resolvePlatform(data: Record<string, unknown>, ctx?: TransformContext): string {
  const kanal = String(data.Kanal || "");
  const platform = String(data.Platform || "");
  const combined = `${kanal} ${platform}`.toUpperCase();

  if (ctx && ctx.platformConfig.length > 0) {
    for (const config of ctx.platformConfig) {
      if (combined.includes(config.source_pattern.toUpperCase())) {
        return config.target_platform;
      }
    }
  }

  if (combined.includes("SHOPEE")) return "SHOPEE";
  if (combined.includes("TIKTOK")) return "TIKTOK SHOP";
  return "WEB";
}

function mapRegion(provinsi: string, ctx?: TransformContext): string {
  if (ctx && ctx.regionConfig.length > 0) {
    for (const config of ctx.regionConfig) {
      if (provinsi.includes(config.province_pattern.replace(/%/g, ""))) {
        return config.region;
      }
    }
  }

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

    // Safe math evaluator: only allow numbers and basic operators
    if (!/^[\d\s\+\-\*\/\(\)\.]+$/.test(formula)) {
      console.warn(`Unsafe formula expression rejected: ${expression}`);
      return 0;
    }

    const result = eval(formula);
    return Number(result) || 0;
  } catch {
    return 0;
  }
}

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
    const financeRow: Record<string, unknown> = {};

    const financeMappings = ctx.mappings.filter(
      (m) => m.target_table === "finance" && m.source_file === row.source_file
    );

    for (const mapping of financeMappings) {
      financeRow[mapping.target_column] = applyTransform(row.raw_data, mapping, ctx);
    }

    // Auto-compute HPP if not mapped (per-unit × quantity)
    if (!financeRow["HPP Sigma"]) {
      const productCode = String(row.raw_data.ProductCode || row.raw_data.SKU || row.raw_data.product_code || "");
      const platform = resolvePlatform(row.raw_data, ctx);
      const qty = toNumber(row.raw_data.Quantity || row.raw_data.Qty || row.raw_data.Jumlah || 1);
      financeRow["HPP Sigma"] = resolveHPP(productCode, platform, ctx) * qty;
    }

    // Auto-compute Total Bayar if not mapped
    if (!financeRow["Total Bayar"]) {
      financeRow["Total Bayar"] = toNumber(
        row.raw_data.Totalperline || row.raw_data.Subtotal || row.raw_data.total || 0
      );
    }

    result.push(financeRow);
  }

  return result;
}

export function applyMarketingTransforms(
  rawRows: { id: number; raw_data: Record<string, unknown>; source_file: string }[],
  ctx: TransformContext
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (const row of rawRows) {
    const marketingRow: Record<string, unknown> = {};

    const marketingMappings = ctx.mappings.filter(
      (m) => m.target_table === "marketing" && m.source_file === row.source_file
    );

    for (const mapping of marketingMappings) {
      marketingRow[mapping.target_column] = applyTransform(row.raw_data, mapping, ctx);
    }

    // Auto-compute Tahun/Bulan if not mapped
    if (!marketingRow["Tahun"] || !marketingRow["Bulan"]) {
      const dateStr = parseDate(
        String(row.raw_data.Date || row.raw_data.Tanggal || row.raw_data["Tanggal Transaksi"] || "")
      );
      const date = new Date(dateStr);
      if (!marketingRow["Tahun"]) marketingRow["Tahun"] = date.getFullYear();
      if (!marketingRow["Bulan"]) marketingRow["Bulan"] = getMonthName(date.getMonth());
    }

    // Auto-compute HPP if not mapped (per-unit × quantity)
    if (!marketingRow["HPP"]) {
      const productCode = String(row.raw_data.ProductCode || row.raw_data.SKU || row.raw_data.product_code || "");
      const platform = resolvePlatform(row.raw_data, ctx);
      const qty = toNumber(row.raw_data.Quantity || row.raw_data.Qty || row.raw_data.Jumlah || 1);
      marketingRow["HPP"] = resolveHPP(productCode, platform, ctx) * qty;
    }

    // Auto-compute SKU if not mapped
    if (!marketingRow["SKU"]) {
      marketingRow["SKU"] = String(row.raw_data.ProductCode || row.raw_data.SKU || row.raw_data.product_code || "");
    }

    result.push(marketingRow);
  }

  return result;
}
