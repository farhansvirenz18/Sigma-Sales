# PROBLEM.md - Permasalahan & Solusi

## 1. Parsing Excel dengan xlsx Library

**Problem:**
Library `xlsx` (SheetJS) tidak memiliki fitur streaming bawaan. File Excel besar (ribuan baris) memakan banyak memori karena harus dimuat seluruhnya ke RAM sebelum diproses.

**Solusi:**
Implementasi custom streaming parser `parseExcelFileStreaming()` di `src/lib/excel/parser.ts`:
- Membaca file dalam chunk (1000 baris per iterasi)
- Menggunakan callback async untuk memproses baris secara bertahap
- Auto-switch: file >10MB pakai streaming, ≤10MB pakai parsing reguler
- Memory usage turun ~80% untuk file besar

---

## 2. Inngest v4 API Breaking Change

**Problem:**
Inngest v4 mengubah format `send()`. Format lama `send("event-name", { data: {...} })` menyebabkan error karena parameter kedua sekarang harus objek `{ name, data }`.

**Solusi:**
Update semua pemanggilan Inngest ke format v4:
```typescript
// Lama (error)
await inngest.send("process-upload", { data: { sessionId: "..." } });

// Baru (benar)
await inngest.send({ name: "process-upload", data: { sessionId: "..." } });
```

---

## 3. Upsert File Excel (Re-upload)

**Problem:**
User ingin upload file yang sama untuk sesi baru (misalnya setelah koreksi data). Namun database memiliki foreign key constraint dan unique constraint yang mencegah insert duplikat.

**Solusi:**
Implementasi alur upsert di `src/app/api/upload/route.ts`:
1. Cek apakah ada session `pending/validating/processing` dengan `file_hash` yang sama
2. Jika ya, tampilkan modal konfirmasi ke user
3. Jika dikonfirmasi:
   - Hapus semua `sales_raw`, `output_files`, `processing_logs` lama
   - Reset session ke status `pending`
   - Insert ulang data baru
   - Kirim ulang Inngest event
4. Menggunakan `file_hash` (SHA-256) untuk deteksi duplikat

---

## 4. Kolom Mapping yang Hilang (Advertiser & TaxName)

**Problem:**
Tidak semua file sumber memiliki kolom yang dibutuhkan output:
- `SALES_MP` tidak punya kolom `Advertiser`
- `SALES_MP` dan `SALES_PRODUK` tidak punya kolom `TaxName`

**Solusi:**
- Mapping dikonfigurasi di database (`column_mappings` table)
- Kolom yang tidak ada di source akan diisi kosong/null di output
- ColumnMapper UI (opsional) menampilkan peringatan "kolom tidak ditemukan" tetapi tetap melanjutkan proses
- Default flow menggunakan mapping seed data yang sudah dikonfigurasi

---

## 5. Transformasi Bundle (BOXL)

**Problem:**
Produk bundle seperti BOXL berisi beberapa item dalam satu paket. Baris bundle harus dipecah menjadi beberapa baris terpisah di output, masing-masing dengan HPP dan jumlah yang benar.

**Solusi:**
- Konfigurasi bundle di database (`bundle_items` table via migration 005)
- Saat proses transformasi, cek apakah SKU mengandung `B`
- Jika ya, lookup bundle items dari database
- Pecah menjadi N baris (satu per item dalam bundle)
- Hitung `bundle_qty = jumlah × bundle_count`

---

## 6. Region Resolution (Auto-detect dari Alamat)

**Problem:**
File input tidak memiliki kolom Region. Region harus ditentukan berdasarkan alamat pengiriman (kota/kabupaten). Beberapa ekspedisi tidak menggunakan kode region.

**Solusi:**
- Mapping region dikonfigurasi di database (`regions` table via migration 005)
- Fungsi `resolveRegion()` di mapper melakukan lookup berdasarkan `city` atau `regency`
- Fallback ke `city` jika `regency` tidak ditemukan
- Jika tidak ada match, region dikosongkan (bukan error)

---

## 7. Async Processing dengan Inngest

**Problem:**
Proses validasi dan transformasi memakan waktu (2-5 menit untuk file besar). Jika dilakukan synchronously, request timeout akan terjadi.

**Solusi:**
- Upload hanya menyimpan data mentah + membuat session
- Proses berat dikirim ke Inngest sebagai background job
- Frontend poll status via API `/api/sessions/[id]`
- Inngest handle retry, timeout, dan logging
- Status session: `pending` → `validating` → `processing` → `completed/failed`

---

## 8. Rollback & Re-upload

**Problem:**
Jika proses gagal di tengah jalan atau hasil transformasi salah, user perlu cara untuk mengulang dari awal tanpa mengupload ulang file.

**Solusi:**
- Endpoint `POST /api/sessions/[id]/rollback` menghapus semua data proses
- Menghapus `sales_raw`, `output_files`, `processing_logs`
- Reset session ke `pending`
- Frontend sediakan tombol "Upload Ulang" yang trigger rollback + redirect ke upload

---

## 9. Preview File Output Tanpa Download

**Problem:**
User ingin memverifikasi isi file output sebelum download, tetapi tidak ingin download file yang mungkin salah.

**Solusi:**
- Endpoint `GET /api/preview-output/[fileId]` parse xlsx dari Supabase Storage
- Return JSON `{ columns, rows, totalRows }` dengan pagination
- Component `OutputPreviewModal` tampilkan data dalam tabel scrollable
- Pagination (100 baris/halaman) dengan Prev/Next

---

## 10. Mobile Responsive Design

**Problem:**
Dashboard dan halaman-halaman awal dirancang desktop-first, tidak optimal di mobile.

**Solusi:**
- Refactor `globals.css` dengan utility classes responsive
- Mobile touch target minimum 44px
- Navbar: hamburger menu di mobile, horizontal pills di desktop
- Dashboard: single column di mobile, 4-column grid di desktop
- History: card view di mobile, table view di desktop
- Step indicator: compact badges di mobile, full labels di desktop
