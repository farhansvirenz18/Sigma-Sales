"use client";

import { useState, useMemo } from "react";
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

const TRANSFORM_OPTIONS = [
  { value: "direct", label: "Direct (Langsung)" },
  { value: "date_format", label: "Date (Tanggal)" },
  { value: "number", label: "Number (Angka)" },
  { value: "lookup", label: "Lookup (Cari di DB)" },
  { value: "lookup_hpp", label: "HPP Lookup" },
  { value: "map", label: "Map (Mapping nilai)" },
  { value: "region_map", label: "Region Map" },
  { value: "concat", label: "Concat (Gabung)" },
  { value: "formula", label: "Formula (Rumus)" },
];

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/_/g, "")
    .replace(/\s+/g, "");
}

function similarity(a: string, b: string): number {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);

  if (na === nb) return 100;
  if (na.includes(nb) || nb.includes(na)) return 80;

  // Simple word overlap
  const wordsA = a.toLowerCase().split(/[\s_\-\/]+/).filter(Boolean);
  const wordsB = b.toLowerCase().split(/[\s_\-\/]+/).filter(Boolean);
  let matches = 0;
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb || wa.includes(wb) || wb.includes(wa)) {
        matches++;
        break;
      }
    }
  }
  if (matches > 0) {
    return Math.round((matches / Math.max(wordsA.length, wordsB.length)) * 70);
  }

  return 0;
}

function suggestTransform(sourceCol: string, targetCol: string): string {
  const sc = sourceCol.toLowerCase();
  const tc = targetCol.toLowerCase();

  if (tc.includes("tanggal") || tc.includes("date") || tc.includes("closing") || tc.includes("pesanan")) {
    return "date_format";
  }
  if (tc.includes("jumlah") || tc.includes("qty") || tc.includes("quantity") || tc.includes("omzet") || tc.includes("harga") || tc.includes("hpp") || tc.includes("total")) {
    return "number";
  }
  if (tc.includes("produk") || tc.includes("product") || tc.includes("nama") || tc.includes("sku")) {
    if (sc.includes("productcode") || sc.includes("sku") || sc.includes("kode")) {
      return "lookup";
    }
    return "direct";
  }
  if (tc.includes("hpp")) return "lookup_hpp";
  if (tc.includes("region")) return "region_map";
  if (tc.includes("platform") || tc.includes("payment") || tc.includes("metode")) return "map";

  return "direct";
}

function suggestTarget(
  sourceCol: string,
  allTargets: string[]
): { target: string; score: number } {
  let best = "";
  let bestScore = 0;

  for (const target of allTargets) {
    const score = similarity(sourceCol, target);
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  }

  return { target: best, score: bestScore };
}

interface MappingRowProps {
  sourceCol: string;
  sampleValue: string;
  financeTarget: string;
  financeTransform: string;
  marketingTarget: string;
  marketingTransform: string;
  onFinanceChange: (target: string, transform: string) => void;
  onMarketingChange: (target: string, transform: string) => void;
  allTargets: string[];
}

function MappingRow({
  sourceCol,
  sampleValue,
  financeTarget,
  financeTransform,
  marketingTarget,
  marketingTransform,
  onFinanceChange,
  onMarketingChange,
  allTargets,
}: MappingRowProps) {
  const [financeSearch, setFinanceSearch] = useState(financeTarget);
  const [marketingSearch, setMarketingSearch] = useState(marketingTarget);
  const [showFinanceDropdown, setShowFinanceDropdown] = useState(false);
  const [showMarketingDropdown, setShowMarketingDropdown] = useState(false);

  const filterTargets = (search: string) => {
    if (!search) return allTargets;
    const lower = search.toLowerCase();
    return allTargets.filter((t) => t.toLowerCase().includes(lower));
  };

  return (
    <tr className="border-b border-gray-100 table-row-hover">
      <td className="py-2 px-3">
        <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded inline-block">
          {sourceCol}
        </div>
        {sampleValue && (
          <div className="text-[10px] text-gray-400 mt-0.5 max-w-[120px] truncate">
            ex: {sampleValue}
          </div>
        )}
      </td>

      {/* Finance Target */}
      <td className="py-2 px-2">
        <div className="flex flex-col space-y-1">
          <div className="relative">
            <input
              type="text"
              value={financeSearch}
              onChange={(e) => {
                setFinanceSearch(e.target.value);
                setShowFinanceDropdown(true);
                onFinanceChange(e.target.value, financeTransform);
              }}
              onFocus={() => setShowFinanceDropdown(true)}
              onBlur={() => setTimeout(() => setShowFinanceDropdown(false), 200)}
              placeholder="Ketik atau pilih..."
              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {showFinanceDropdown && (
              <div className="absolute z-10 top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filterTargets(financeSearch).map((t) => (
                  <button
                    key={t}
                    onMouseDown={() => {
                      onFinanceChange(t, suggestTransform(sourceCol, t));
                      setFinanceSearch(t);
                      setShowFinanceDropdown(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-blue-50 truncate"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={financeTransform}
            onChange={(e) => onFinanceChange(financeTarget, e.target.value)}
            className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
          >
            {TRANSFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </td>

      {/* Marketing Target */}
      <td className="py-2 px-2">
        <div className="flex flex-col space-y-1">
          <div className="relative">
            <input
              type="text"
              value={marketingSearch}
              onChange={(e) => {
                setMarketingSearch(e.target.value);
                setShowMarketingDropdown(true);
                onMarketingChange(e.target.value, marketingTransform);
              }}
              onFocus={() => setShowMarketingDropdown(true)}
              onBlur={() => setTimeout(() => setShowMarketingDropdown(false), 200)}
              placeholder="Ketik atau pilih..."
              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"
            />
            {showMarketingDropdown && (
              <div className="absolute z-10 top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filterTargets(marketingSearch).map((t) => (
                  <button
                    key={t}
                    onMouseDown={() => {
                      onMarketingChange(t, suggestTransform(sourceCol, t));
                      setMarketingSearch(t);
                      setShowMarketingDropdown(false);
                    }}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-purple-50 truncate"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <select
            value={marketingTransform}
            onChange={(e) => onMarketingChange(marketingTarget, e.target.value)}
            className="w-full px-1 py-0.5 border border-gray-200 rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-purple-400 bg-gray-50"
          >
            {TRANSFORM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  );
}

export default function ColumnMapper({
  files,
  onSave,
  onSkip,
  loading = false,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<
    Record<string, { finance: string; fTransform: string; marketing: string; mTransform: string }>
  >({});

  const getFileSource = (fileName: string): string => {
    const lower = fileName.toLowerCase();
    if (lower.includes("daily")) return "SALES_DAILY";
    if (lower.includes("mp")) return "SALES_MP";
    if (lower.includes("produk") || lower.includes("product")) return "SALES_PRODUK";
    return fileName.replace(/\.[^.]+$/, "").toUpperCase().replace(/[^A-Z0-9]/g, "_");
  };

  const allTargets = useMemo(() => {
    const set = new Set([...FINANCE_COLUMNS, ...MARKETING_COLUMNS]);
    return Array.from(set).sort();
  }, []);

  const handleMappingChange = (
    sourceFile: string,
    sourceCol: string,
    field: "finance" | "marketing",
    value: string,
    transform: string
  ) => {
    setMappings((prev) => {
      const key = `${sourceFile}|${sourceCol}`;
      const existing = prev[key] || { finance: "", fTransform: "direct", marketing: "", mTransform: "direct" };
      return {
        ...prev,
        [key]: {
          ...existing,
          [field === "finance" ? "finance" : "marketing"]: value,
          [field === "finance" ? "fTransform" : "mTransform"]: transform,
        },
      };
    });
  };

  const handleAutoMap = (sourceFile: string, columns: string[]) => {
    const newMappings = { ...mappings };
    for (const col of columns) {
      const key = `${sourceFile}|${col}`;
      const finSuggest = suggestTarget(col, FINANCE_COLUMNS);
      const mktSuggest = suggestTarget(col, MARKETING_COLUMNS);

      newMappings[key] = {
        finance: finSuggest.score >= 40 ? finSuggest.target : "",
        fTransform: finSuggest.score >= 40 ? suggestTransform(col, finSuggest.target) : "direct",
        marketing: mktSuggest.score >= 40 ? mktSuggest.target : "",
        mTransform: mktSuggest.score >= 40 ? suggestTransform(col, mktSuggest.target) : "direct",
      };
    }
    setMappings(newMappings);
  };

  const handleSave = () => {
    const allMappings: MappingEntry[] = [];

    for (const file of files) {
      const source = getFileSource(file.name);

      for (const col of file.columns) {
        const key = `${source}|${col}`;
        const m = mappings[key];
        if (!m) continue;

        if (m.finance) {
          allMappings.push({
            source_file: source,
            source_column: col,
            target_table: "finance",
            target_column: m.finance,
            transform_rule: { type: m.fTransform },
          });
        }
        if (m.marketing) {
          allMappings.push({
            source_file: source,
            source_column: col,
            target_table: "marketing",
            target_column: m.marketing,
            transform_rule: { type: m.mTransform },
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
          <h2 className="text-lg font-semibold text-gray-900">Mapping Kolom</h2>
          <p className="text-sm text-gray-600">
            Map kolom input ke kolom output. Ketik nama kolom atau pilih dari dropdown.
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
                    Source: {source} | {file.rowCount} baris | {file.columns.length} kolom
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleAutoMap(source, file.columns)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Auto-Map
                  </button>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      file.source
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {file.source ? "Auto-detected" : "Manual"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600 text-xs">
                        Kolom Input
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-blue-600 text-xs">
                        → Finance Output + Transform
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-purple-600 text-xs">
                        → Marketing Output + Transform
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {file.columns.map((col) => {
                      const key = `${source}|${col}`;
                      const m = mappings[key] || {
                        finance: "",
                        fTransform: "direct",
                        marketing: "",
                        mTransform: "direct",
                      };
                      const sampleVal = file.sampleData[0]
                        ? String(file.sampleData[0][col] ?? "").slice(0, 25)
                        : "";

                      return (
                        <MappingRow
                          key={col}
                          sourceCol={col}
                          sampleValue={sampleVal}
                          financeTarget={m.finance}
                          financeTransform={m.fTransform}
                          marketingTarget={m.marketing}
                          marketingTransform={m.mTransform}
                          onFinanceChange={(target, transform) =>
                            handleMappingChange(source, col, "finance", target, transform)
                          }
                          onMarketingChange={(target, transform) =>
                            handleMappingChange(source, col, "marketing", target, transform)
                          }
                          allTargets={allTargets}
                        />
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
