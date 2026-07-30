"use client";

import { useState } from "react";
import Card, { CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export interface DetectedFile {
  name: string;
  source: string | null;
  columns: string[];
  sampleData: Record<string, unknown>[];
  rowCount: number;
}

export interface MappingEntry {
  source_file: string;
  source_column: string;
  target_table: string;
  target_column: string;
  transform_rule: Record<string, unknown>;
}

interface ColumnMapperProps {
  files: DetectedFile[];
  onSave: (mappings: MappingEntry[]) => void;
  onSkip: () => void;
  loading?: boolean;
}

const FINANCE_COLUMNS = [
  "Tanggal Closing",
  "Tanggal Pesanan",
  "No. Invoice",
  "No Resi",
  "Ekspedisi",
  "Type Transaksi",
  "Advertiser",
  "Platform",
  "Nama Toko",
  "Produk Name",
  "Jumlah",
  "Omzet",
  "HPP Sigma",
  "TaxName(%)",
  "Total Bayar",
  "Payment type",
];

const MARKETING_COLUMNS = [
  "Tahun",
  "Bulan",
  "Tanggal Closing",
  "Tanggal Pesanan",
  "No. Invoice",
  "No Resi",
  "Memo",
  "Region",
  "Ekspedisi",
  "Advertiser",
  "Platform",
  "Nama Toko",
  "Produk",
  "Jumlah",
  "Omzet",
  "HPP",
  "Kode Promo",
  "Total Bayar",
  "Metode Pembayaran",
  "SKU",
];

function getTransformType(
  sourceCol: string,
  targetCol: string
): Record<string, unknown> {
  const dateCols = ["Date", "Tanggal Closing", "Tanggal Pesanan"];
  const numberCols = ["Quantity", "UnitPrice", "Totalperline", "Jumlah", "Omzet"];
  const lookupCols = ["ProductCode"];
  const mapCols: Record<string, Record<string, string>> = {
    MetodeBayar: { TF: "Transfer", COD: "COD" },
    Kanal: { A: "WEB", SHOPEE: "SHOPEE", "Tiktok Shop": "TIKTOK SHOP" },
  };

  if (dateCols.includes(targetCol) || dateCols.includes(sourceCol)) {
    return { type: "date_format" };
  }
  if (numberCols.includes(sourceCol) || numberCols.includes(targetCol)) {
    return { type: "number" };
  }
  if (lookupCols.includes(sourceCol)) {
    if (targetCol === "Produk Name" || targetCol === "Produk") {
      return { type: "lookup", table: "products", field: "name" };
    }
    return { type: "direct" };
  }
  if (targetCol === "HPP Sigma" || targetCol === "HPP") {
    return { type: "lookup_hpp" };
  }
  if (targetCol === "Region") {
    return { type: "region_map" };
  }
  if (mapCols[sourceCol]) {
    return { type: "map", mapping: mapCols[sourceCol] };
  }
  return { type: "direct" };
}

export default function ColumnMapper({
  files,
  onSave,
  onSkip,
  loading = false,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<Record<string, Record<string, string>>>({});

  const getFileSource = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes("daily")) return "SALES_DAILY";
    if (lower.includes("mp")) return "SALES_MP";
    if (lower.includes("produk") || lower.includes("product"))
      return "SALES_PRODUK";
    return "SALES_DAILY";
  };

  const handleMappingChange = (
    sourceFile: string,
    sourceCol: string,
    targetCol: string
  ) => {
    setMappings((prev) => {
      const fileMappings = { ...(prev[sourceFile] || {}) };
      if (targetCol === "") {
        delete fileMappings[sourceCol];
      } else {
        fileMappings[sourceCol] = targetCol;
      }
      return { ...prev, [sourceFile]: fileMappings };
    });
  };

  const handleSave = () => {
    const allMappings: MappingEntry[] = [];

    for (const file of files) {
      const source = getFileSource(file.name);
      const fileMappings = mappings[source] || {};

      for (const [sourceCol, targetCol] of Object.entries(fileMappings)) {
        if (targetCol === "finance" || targetCol === "marketing") continue;

        const isFinance = FINANCE_COLUMNS.includes(targetCol);
        const isMarketing = MARKETING_COLUMNS.includes(targetCol);

        if (isFinance) {
          allMappings.push({
            source_file: source,
            source_column: sourceCol,
            target_table: "finance",
            target_column: targetCol,
            transform_rule: getTransformType(sourceCol, targetCol),
          });
        }
        if (isMarketing) {
          allMappings.push({
            source_file: source,
            source_column: sourceCol,
            target_table: "marketing",
            target_column: targetCol,
            transform_rule: getTransformType(sourceCol, targetCol),
          });
        }
      }
    }

    onSave(allMappings);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Mapping Kolom
          </h2>
          <p className="text-sm text-gray-600">
            Pilih kolom input yang ingin di-mapping ke kolom output
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={onSkip}>
            Gunakan Default
          </Button>
          <Button onClick={handleSave} loading={loading}>
            Simpan Mapping
          </Button>
        </div>
      </div>

      {files.map((file) => {
        const source = getFileSource(file.name);
        return (
          <Card key={file.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{file.name}</h3>
                  <p className="text-xs text-gray-500">
                    Source: {source} | {file.rowCount} baris |{" "}
                    {file.columns.length} kolom
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    file.source
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {file.source ? "Auto-detected" : "Manual Mapping"}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Kolom Input
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600 w-12">
                        →
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Kolom Output (Finance)
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Kolom Output (Marketing)
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-600">
                        Sample Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {file.columns.map((col) => {
                      const currentMapping = mappings[source] || {};
                      const mappedTo = currentMapping[col] || "";

                      return (
                        <tr
                          key={col}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-2 px-3">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {col}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-400">→</td>
                          <td className="py-2 px-3">
                            <select
                              value={
                                FINANCE_COLUMNS.includes(mappedTo)
                                  ? mappedTo
                                  : ""
                              }
                              onChange={(e) =>
                                handleMappingChange(source, col, e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Tidak di-map --</option>
                              {FINANCE_COLUMNS.map((fc) => (
                                <option key={fc} value={fc}>
                                  {fc}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={
                                MARKETING_COLUMNS.includes(mappedTo)
                                  ? mappedTo
                                  : ""
                              }
                              onChange={(e) =>
                                handleMappingChange(source, col, e.target.value)
                              }
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Tidak di-map --</option>
                              {MARKETING_COLUMNS.map((mc) => (
                                <option key={mc} value={mc}>
                                  {mc}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <span className="text-xs text-gray-500">
                              {file.sampleData[0]
                                ? String(file.sampleData[0][col] || "-").slice(
                                    0,
                                    20
                                  )
                                : "-"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
