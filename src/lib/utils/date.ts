import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

export function formatDate(
  dateStr: string,
  inputFormat: string,
  outputFormat: string
): string {
  const parsed = dayjs(dateStr, inputFormat);
  if (!parsed.isValid()) return dateStr;
  return parsed.format(outputFormat);
}

export function parseDate(dateStr: string): string {
  const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY", "DD-MM-YYYY"];
  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true);
    if (parsed.isValid()) {
      return parsed.format("YYYY-MM-DD");
    }
  }
  return dateStr;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.-]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}
