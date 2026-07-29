import * as XLSX from "xlsx";
import { SourceFile } from "@/types";

interface ParseResult {
  source: SourceFile;
  rows: Record<string, unknown>[];
  errors: { row: number; message: string }[];
}

export function parseExcelFile(
  buffer: Buffer,
  source: SourceFile
): ParseResult {
  try {
    const workbook = XLSX.read(buffer, {
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { source, rows: [], errors: [{ row: 0, message: "No sheets found" }] };
    }

    const sheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
      raw: false,
    });

    const normalizedRows = jsonData.map((row, index) => normalizeRow(row, source, index + 1));

    return {
      source,
      rows: normalizedRows,
      errors: [],
    };
  } catch (error) {
    return {
      source,
      rows: [],
      errors: [{ row: 0, message: `Parse error: ${error}` }],
    };
  }
}

function normalizeRow(
  row: Record<string, unknown>,
  source: SourceFile,
  rowNumber: number
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim();
    normalized[cleanKey] = value;
  }

  if (source === "SALES_DAILY") {
    normalized._source = "SALES_DAILY";
  } else if (source === "SALES_MP") {
    normalized._source = "SALES_MP";
  } else if (source === "SALES_PRODUK") {
    normalized._source = "SALES_PRODUK";
  }

  normalized._rowNumber = rowNumber;

  return normalized;
}

export function detectSourceFile(filename: string): SourceFile | null {
  const lower = filename.toLowerCase();

  if (lower.includes("daily")) return "SALES_DAILY";
  if (lower.includes("mp")) return "SALES_MP";
  if (lower.includes("produk") || lower.includes("product")) return "SALES_PRODUK";

  return null;
}

export function extractRowData(
  row: Record<string, unknown>,
  fieldsToExtract: string[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fieldsToExtract) {
    result[field] = row[field] ?? null;
  }
  return result;
}
