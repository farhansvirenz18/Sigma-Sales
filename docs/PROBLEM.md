# PROBLEM.md - Kendala Teknis & Solusi

## 1. Format Kolom Tidak Konsisten

### Problem
Tiga file input memiliki format kolom yang berbeda:
- SALES DAILY: kolom ADV, ProvinsiCustomer, KabupatenCustomer
- SALES MP: kolom City, Province
- SALES Produk: format tanggal DD/MM/YYYY

### Solusi
- Mapping kolom disimpan di database (`column_mappings` table)
- Transform rules menggunakan JSONB untuk fleksibilitas
- Setiap source file punya mapping sendiri-sendiri
- Format tanggal dinormalisasi ke YYYY-MM-DD menggunakan dayjs

---

## 2. HPP Berbeda Per Platform

### Problem
Harga pokok penjualan (HPP) produk berbeda untuk setiap platform (WEB, SHOPEE, TIKTOK SHOP).

### Solusi
- Tabel `product_prices` menyimpan HPP per platform
- Composite key: `(product_code, platform, effective_date)`
- Lookup HPP dilakukan saat transformasi menggunakan `resolvePlatform()`
- Mendukung perubahan harga di masa depan via effective_date

---

## 3. Duplikasi Data Saat Re-import

### Problem
User mungkin upload file yang sama beberapa kali, menyebabkan data duplikat.

### Solusi
- Unique constraint di tabel `sales_raw`:
  ```sql
  UNIQUE(session_id, source_file, raw_data->>'OrderNumber', raw_data->>'ProductCode')
  ```
- Upsert logic: jika ada duplikat, skip atau update
- Session ID membedakan antar upload batch

---

## 4. File Excel Besar (Memory Limit)

### Problem
File Excel besar bisa menyebabkan memory overflow di serverless functions.

### Solusi
- Parse menggunakan streaming mode (`cellDates: true, raw: false`)
- Batch insert ke database (1000 rows per batch)
- Inngest queue memproses data secara async
- Vercel serverless timeout diatasi dengan background job

---

## 5. Bundle Produk (Multi-Item)

### Problem
Satu order bisa berisi bundle produk (2+ produk).

### Solusi
- Field `raw_data` menggunakan JSONB untuk fleksibilitas
- Logic bundle ditangani saat transformasi
- Bundle items bisa di-explode menjadi multiple rows di output

---

## 6. Validasi Data di Database

### Problem
Validasi harus dinamis dan bisa diubah tanpa deploy ulang.

### Solusi
- Rules disimpan di tabel `validation_rules`
- Support berbagai tipe validasi: required, type, format, lookup, range
- Error messages bisa dikonfigurasi
- Severity level: error (block) atau warning (allow)

---

## 7. Real-time Progress

### Problem
User perlu melihat progress pemrosesan secara real-time.

### Solusi
- Supabase Realtime subscriptions untuk update status
- Progress bar menampilkan persentase
- Status berubah: pending → validating → processing → completed
- Toast notifications untuk success/error

---

## 8. Rollback Data

### Problem
Jika ada error, user perlu membatalkan proses dan menghapus data.

### Solusi
- Fungsi `rollbackSession()` menghapus:
  1. Output files dari storage
  2. Output records dari database
  3. Raw data dari database
  4. Update session status ke 'rolled_back'
- Audit trail tersimpan di `processing_logs`

---

## 9. Serverless Queue

### Problem
Vercel tidak support background process traditional.

### Solusi
- Inngest: serverless-native queue
- Functions dijalankan sebagai background jobs
- Built-in retry mechanism
- Progress tracking via SSE (Server-Sent Events)
- Free tier: 50k steps/month

---

## 10. Output Excel Formatting

### Problem
Output Excel perlu diformat sesuai template yang diminta.

### Solusi
- Menggunakan library ExcelJS untuk format lengkap
- Header styling: bold, warna, alignment
- Number formatting untuk kolom numerik
- Auto-width columns
- Upload ke Supabase Storage untuk download
