import ExcelJS from "exceljs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { FinanceRow, MarketingRow } from "@/types";

export async function generateFinanceExcel(
  data: FinanceRow[],
  sessionId: string
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("FINANCE");

  sheet.columns = [
    { header: "Tanggal Closing", key: "Tanggal Closing", width: 15 },
    { header: "Tanggal Pesanan", key: "Tanggal Pesanan", width: 15 },
    { header: "No. Invoice", key: "No. Invoice", width: 20 },
    { header: "No Resi", key: "No Resi", width: 15 },
    { header: "Ekspedisi", key: "Ekspedisi", width: 20 },
    { header: "Type Transaksi", key: "Type Transaksi", width: 15 },
    { header: "Advertiser", key: "Advertiser", width: 15 },
    { header: "Platform", key: "Platform", width: 15 },
    { header: "Nama Toko", key: "Nama Toko", width: 20 },
    { header: "Produk Name", key: "Produk Name", width: 20 },
    { header: "Jumlah", key: "Jumlah", width: 10 },
    { header: "Omzet", key: "Omzet", width: 15 },
    { header: "HPP Sigma", key: "HPP Sigma", width: 15 },
    { header: "TaxName(%)", key: "TaxName(%)", width: 12 },
    { header: "Total Bayar", key: "Total Bayar", width: 15 },
    { header: "Payment type", key: "Payment type", width: 15 },
  ];

  styleHeaderRow(sheet);

  for (const row of data) {
    sheet.addRow(row);
  }

  addNumberFormats(sheet, [11, 12, 13, 14, 15]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filePath = `${sessionId}/FINANCE_${Date.now()}.xlsx`;

  const supabase = supabaseAdmin;
  const { error: uploadError } = await supabase.storage
    .from("output-files")
    .upload(filePath, buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

  if (uploadError) {
    throw new Error(`Failed to upload FINANCE to storage: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("output_files").insert({
    session_id: sessionId,
    file_type: "FINANCE",
    file_name: `FINANCE_${new Date().toISOString().split("T")[0]}.xlsx`,
    file_path: filePath,
    file_size: buffer.byteLength,
    row_count: data.length,
  });

  if (insertError) {
    throw new Error(`Failed to insert FINANCE metadata: ${insertError.message}`);
  }

  return filePath;
}

export async function generateMarketingExcel(
  data: MarketingRow[],
  sessionId: string
): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("MARKETING");

  sheet.columns = [
    { header: "Tahun", key: "Tahun", width: 10 },
    { header: "Bulan", key: "Bulan", width: 12 },
    { header: "Tanggal Closing", key: "Tanggal Closing", width: 15 },
    { header: "Tanggal Pesanan", key: "Tanggal Pesanan", width: 15 },
    { header: "No. Invoice", key: "No. Invoice", width: 20 },
    { header: "No. Resi", key: "No Resi", width: 15 },
    { header: "Memo", key: "Memo", width: 15 },
    { header: "Region", key: "Region", width: 12 },
    { header: "Ekspedisi", key: "Ekspedisi", width: 20 },
    { header: "Advertiser", key: "Advertiser", width: 15 },
    { header: "Platform", key: "Platform", width: 15 },
    { header: "Nama Toko", key: "Nama Toko", width: 20 },
    { header: "Produk", key: "Produk", width: 20 },
    { header: "Jumlah", key: "Jumlah", width: 10 },
    { header: "Omzet", key: "Omzet", width: 15 },
    { header: "HPP", key: "HPP", width: 15 },
    { header: "Kode Promo", key: "Kode Promo", width: 12 },
    { header: "Total Bayar", key: "Total Bayar", width: 15 },
    { header: "Metode Pembayaran", key: "Metode Pembayaran", width: 18 },
    { header: "SKU", key: "SKU", width: 12 },
  ];

  styleHeaderRow(sheet);

  for (const row of data) {
    sheet.addRow(row);
  }

  addNumberFormats(sheet, [14, 15, 16, 18]);

  const buffer = await workbook.xlsx.writeBuffer();
  const filePath = `${sessionId}/MARKETING_${Date.now()}.xlsx`;

  const supabase = supabaseAdmin;
  const { error: uploadError } = await supabase.storage
    .from("output-files")
    .upload(filePath, buffer, {
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

  if (uploadError) {
    throw new Error(`Failed to upload MARKETING to storage: ${uploadError.message}`);
  }

  const { error: insertError } = await supabase.from("output_files").insert({
    session_id: sessionId,
    file_type: "MARKETING",
    file_name: `MARKETING_${new Date().toISOString().split("T")[0]}.xlsx`,
    file_path: filePath,
    file_size: buffer.byteLength,
    row_count: data.length,
  });

  if (insertError) {
    throw new Error(`Failed to insert MARKETING metadata: ${insertError.message}`);
  }

  return filePath;
}

function styleHeaderRow(sheet: ExcelJS.Worksheet): void {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;
}

function addNumberFormats(sheet: ExcelJS.Worksheet, columns: number[]): void {
  for (const col of columns) {
    sheet.getColumn(col).numFmt = "#,##0";
  }
}
