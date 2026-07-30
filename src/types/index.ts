export type SessionStatus =
  | "pending"
  | "validating"
  | "processing"
  | "completed"
  | "failed"
  | "rolled_back";

export type ValidationStatus = "pending" | "valid" | "error";

export type SourceFile = "SALES_DAILY" | "SALES_MP" | "SALES_PRODUK";

export type OutputFileType = "FINANCE" | "MARKETING";

export type RuleType =
  | "required"
  | "type"
  | "format"
  | "lookup"
  | "range"
  | "unique";

export interface UploadSession {
  id: string;
  status: SessionStatus;
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  files_uploaded: FileUploadInfo[];
  error_summary: ErrorSummary[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  created_by: string | null;
}

export interface FileUploadInfo {
  name: string;
  path: string;
  row_count: number;
  source: SourceFile;
}

export interface ErrorSummary {
  row_number: number;
  source_file: string;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
}

export interface SalesRaw {
  id: number;
  session_id: string;
  source_file: SourceFile;
  row_number: number;
  raw_data: Record<string, unknown>;
  validation_status: ValidationStatus;
  validation_errors: ValidationError[];
  is_processed: boolean;
  created_at: string;
}

export interface Product {
  code: string;
  name: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductPrice {
  id: number;
  product_code: string;
  platform: string;
  hpp: number;
  effective_date: string;
  created_at: string;
}

export interface ColumnMapping {
  id: number;
  source_file: SourceFile;
  source_column: string;
  target_table: "finance" | "marketing";
  target_column: string;
  transform_rule: TransformRule;
  is_required: boolean;
  default_value: string | null;
  created_at: string;
}

export interface TransformRule {
  type:
    | "direct"
    | "date_format"
    | "number"
    | "lookup"
    | "lookup_hpp"
    | "map"
    | "region_map"
    | "concat"
    | "formula";
  input?: string;
  output?: string;
  table?: string;
  field?: string;
  mapping?: Record<string, string>;
  fields?: string[];
  separator?: string;
  expression?: string;
}

export interface OutputFile {
  id: string;
  session_id: string;
  file_type: OutputFileType;
  file_name: string;
  file_path: string;
  file_size: number | null;
  row_count: number | null;
  storage_bucket: string;
  created_at: string;
}

export interface ProcessingLog {
  id: number;
  session_id: string | null;
  step: string;
  status: "started" | "completed" | "failed";
  details: Record<string, unknown>;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface ValidationRule {
  id: number;
  source_file: SourceFile;
  field_name: string;
  rule_type: RuleType;
  rule_config: Record<string, unknown>;
  error_message: string;
  severity: "error" | "warning";
  is_active: boolean;
  created_at: string;
}

export interface FinanceRow {
  "Tanggal Closing": string;
  "Tanggal Pesanan": string;
  "No. Invoice": string;
  "No Resi": string;
  Ekspedisi: string;
  "Type Transaksi": string;
  Advertiser: string;
  Platform: string;
  "Nama Toko": string;
  "Produk Name": string;
  Jumlah: number;
  Omzet: number;
  "HPP Sigma": number;
  "TaxName(%)": string;
  "Total Bayar": number;
  "Payment type": string;
}

export interface MarketingRow {
  Tahun: number;
  Bulan: string;
  "Tanggal Closing": string;
  "Tanggal Pesanan": string;
  "No. Invoice": string;
  "No Resi": string;
  Memo: string;
  Region: string;
  Ekspedisi: string;
  Advertiser: string;
  Platform: string;
  "Nama Toko": string;
  Produk: string;
  Jumlah: number;
  Omzet: number;
  HPP: number;
  "Kode Promo": string;
  "Total Bayar": number;
  "Metode Pembayaran": string;
  SKU: string;
}

export interface DashboardStats {
  totalSessions: number;
  totalRowsProcessed: number;
  totalErrors: number;
  recentSessions: UploadSession[];
  monthlyProcessing: { month: string; count: number }[];
}
