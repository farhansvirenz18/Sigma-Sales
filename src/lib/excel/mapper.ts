import { supabaseAdmin } from "@/lib/supabase/server";
import { ColumnMapping } from "@/types";
import { parseDate, toNumber } from "@/lib/utils/date";
import { getMonthName } from "@/lib/utils/format";

interface TransformContext {
  products: Map<string, { code: string; name: string }>;
  productPrices: Map<string, { product_code: string; platform: string; hpp: number }>;
  mappings: ColumnMapping[];
}

let cachedContext: TransformContext | null = null;

export async function loadTransformContext(): Promise<TransformContext> {
  if (cachedContext) return cachedContext;

  const [productsRes, pricesRes, mappingsRes] = await Promise.all([
    supabaseAdmin.from("products").select("code, name").eq("is_active", true),
    supabaseAdmin.from("product_prices").select("*"),
    supabaseAdmin.from("column_mappings").select("*"),
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

  cachedContext = {
    products,
    productPrices,
    mappings: (mappingsRes.data as ColumnMapping[]) || [],
  };

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

    case "lookup":
      const record = ctx.products.get(String(sourceValue));
      if (record && rule.field) {
        return (record as Record<string, unknown>)[rule.field] || sourceValue;
      }
      return sourceValue;

    case "lookup_hpp":
      const platform = resolvePlatform(data);
      const priceKey = `${sourceValue}|${platform}`;
      const price = ctx.productPrices.get(priceKey);
      return price ? price.hpp : 0;

    case "map":
      if (rule.mapping && sourceValue !== null && sourceValue !== undefined) {
        return rule.mapping[String(sourceValue)] || sourceValue;
      }
      return sourceValue;

    case "region_map":
      return mapRegion(String(data.ProvinsiCustomer || ""));

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

export function resolvePlatform(data: Record<string, unknown>): string {
  const kanal = String(data.Kanal || "").toUpperCase();
  const platform = String(data.Platform || "").toUpperCase();

  if (kanal.includes("SHOPEE") || platform.includes("SHOPEE")) return "SHOPEE";
  if (kanal.includes("TIKTOK") || platform.includes("TIKTOK")) return "TIKTOK SHOP";
  return "WEB";
}

function mapRegion(provinsi: string): string {
  const regionMap: Record<string, string> = {
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

  for (const [key, region] of Object.entries(regionMap)) {
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
    // Safe evaluation using Function constructor
    const result = new Function(`return ${formula}`)();
    return Number(result) || 0;
  } catch {
    return 0;
  }
}

export function applyFinanceTransforms(
  rawRows: { id: number; raw_data: Record<string, unknown>; source_file: string }[],
  ctx: TransformContext
): Record<string, unknown>[] {
  return rawRows.map((row) => {
    const financeRow: Record<string, unknown> = {};

    const financeMappings = ctx.mappings.filter(
      (m) => m.target_table === "finance" && m.source_file === row.source_file
    );

    for (const mapping of financeMappings) {
      financeRow[mapping.target_column] = applyTransform(row.raw_data, mapping, ctx);
    }

    const platform = resolvePlatform(row.raw_data);
    const productCode = String(row.raw_data.ProductCode || "");
    const priceKey = `${productCode}|${platform}`;
    const price = ctx.productPrices.get(priceKey);

    financeRow["HPP Sigma"] = price ? price.hpp : 0;
    financeRow["Total Bayar"] = toNumber(row.raw_data.Totalperline);

    return financeRow;
  });
}

export function applyMarketingTransforms(
  rawRows: { id: number; raw_data: Record<string, unknown>; source_file: string }[],
  ctx: TransformContext
): Record<string, unknown>[] {
  return rawRows.map((row) => {
    const marketingRow: Record<string, unknown> = {};

    const marketingMappings = ctx.mappings.filter(
      (m) => m.target_table === "marketing" && m.source_file === row.source_file
    );

    for (const mapping of marketingMappings) {
      marketingRow[mapping.target_column] = applyTransform(row.raw_data, mapping, ctx);
    }

    const dateStr = parseDate(String(row.raw_data.Date || ""));
    const date = new Date(dateStr);
    marketingRow["Tahun"] = date.getFullYear();
    marketingRow["Bulan"] = getMonthName(date.getMonth());

    const platform = resolvePlatform(row.raw_data);
    const productCode = String(row.raw_data.ProductCode || "");
    const priceKey = `${productCode}|${platform}`;
    const price = ctx.productPrices.get(priceKey);

    marketingRow["HPP"] = price ? price.hpp : 0;
    marketingRow["SKU"] = productCode;

    return marketingRow;
  });
}


