# Sigma Sales - Data Processing System

Sistem otomatis untuk import dan transformasi data sales dari 3 file Excel menjadi 2 file output (FINANCE.xlsx dan MARKETING.xlsx). Dibangun dengan Next.js, Supabase, dan Inngest untuk proses async.

## Tech Stack

- **Frontend**: Next.js 16 (React 19) + TypeScript + Tailwind CSS 4
- **Backend**: Next.js API Routes + Inngest v4 (async processing)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Charts**: Recharts
- **File Processing**: xlsx (SheetJS) + ExcelJS

## Fitur

- Upload 3 file Excel sekaligus (drag & drop)
- Upsert / re-upload file yang sama dengan konfirmasi
- Streaming reader untuk file besar (>10MB)
- Validasi data otomatis berbasis database rules
- Transformasi data fleksibel via mapping rule DB
- Bundle splitting (BOXL → item terpisah)
- Auto region resolution dari alamat pengiriman
- Generate 2 file output (FINANCE 16 kolom & MARKETING 20 kolom)
- Real-time progress tracking via Inngest
- Preview output file tanpa download
- History log dengan bulk delete
- Dashboard statistik dengan Recharts charts
- Responsive design (mobile + desktop)
- Rollback & re-upload session

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/farhansvirenz18/Sigma-Sales.git
cd Sigma-Sales
npm install
```

### 2. Environment Variables

Buat file `.env.local` di root project:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Buka **Supabase Dashboard → SQL Editor**, jalankan migration secara berurutan:

```bash
# Jalankan file ini di SQL Editor Supabase
supabase/migrations/001_initial_schema.sql    # Schema dasar (sessions, sales_raw, products, dll)
supabase/migrations/002_seed_data.sql         # Seed data (products, prices, mappings, rules)
supabase/migrations/003_fix_constraint.sql    # Fix constraint issues
supabase/migrations/004_fix_mappings.sql      # Fix column mappings
supabase/migrations/005_bundle_region_platform.sql  # Bundle, region, platform config
```

### 4. Storage Setup

1. Buka **Supabase Dashboard → Storage**
2. Create bucket baru: `output-files`
3. Set public: **false**
4. Set bucket policy agar service role bisa read/write

### 5. Inngest Setup

1. Buat akun di [inngest.com](https://inngest.com)
2. Buat project baru
3. Copy event key dan signing key ke `.env.local`
4. Buka Inngest Dashboard → Sync
5. Masukkan App URL: `https://your-app.vercel.app/api/inngest`
6. Klik **Sync App**
7. Function `process-upload` akan muncul di dashboard

### 6. Run Development

```bash
npm run dev
```

Buka http://localhost:3000

### 7. Build for Production

```bash
npm run build
npm start
```

## Struktur Project

```
sigma-sales/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts              # Upload Excel files
│   │   │   ├── preview/route.ts             # Preview Excel sebelum proses
│   │   │   ├── detect-columns/route.ts      # Auto-detect kolom
│   │   │   ├── mappings/route.ts            # Column mappings CRUD
│   │   │   ├── sessions/route.ts            # List sessions
│   │   │   ├── sessions/[id]/route.ts       # Session detail
│   │   │   ├── sessions/[id]/rollback/route.ts  # Rollback session
│   │   │   ├── sessions/[id]/logs/route.ts  # Session logs
│   │   │   ├── sessions/[id]/errors/route.ts    # Session errors
│   │   │   ├── sessions/batch-delete/route.ts   # Bulk delete
│   │   │   ├── download/[fileId]/route.ts   # Download output file
│   │   │   ├── preview-output/[fileId]/route.ts # Preview output file
│   │   │   ├── stats/route.ts               # Dashboard statistics
│   │   │   └── inngest/route.ts             # Inngest serve
│   │   ├── page.tsx                         # Dashboard (charts, stats)
│   │   ├── upload/page.tsx                  # Upload page
│   │   ├── results/[id]/page.tsx            # Results page
│   │   ├── history/page.tsx                 # History page
│   │   └── globals.css                      # Global styles
│   ├── components/
│   │   ├── ui/                              # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── OutputPreviewModal.tsx
│   │   ├── upload/                          # Upload components
│   │   │   ├── FileDropzone.tsx
│   │   │   ├── FilePreview.tsx
│   │   │   └── ColumnMapper.tsx
│   │   └── charts/                          # Recharts components
│   │       ├── MonthlyChart.tsx
│   │       ├── PlatformPie.tsx
│   │       └── StatusChart.tsx
│   ├── inngest/
│   │   └── functions/
│   │       └── process-upload.ts            # Inngest function
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                    # Browser client
│   │   │   └── server.ts                    # Server client
│   │   ├── excel/
│   │   │   ├── parser.ts                    # Excel parser + streaming
│   │   │   ├── validator.ts                 # Row validation
│   │   │   ├── mapper.ts                    # Data transformation
│   │   │   └── generator.ts                 # Excel file generation
│   │   └── inngest.ts                       # Inngest client
│   └── types/
│       └── index.ts                         # TypeScript types
├── supabase/
│   └── migrations/                          # Database SQL migrations
├── result/                                  # Sample output files
├── docs/                                    # Documentation
└── public/                                  # Static assets
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload 3 Excel files + parse + store |
| POST | `/api/preview` | Preview Excel data sebelum proses |
| POST | `/api/detect-columns` | Auto-detect kolom dari header |
| GET | `/api/mappings` | Get column mappings |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/[id]` | Get session detail |
| POST | `/api/sessions/[id]/rollback` | Rollback session |
| GET | `/api/sessions/[id]/logs` | Get session logs |
| GET | `/api/sessions/[id]/errors` | Get session errors |
| POST | `/api/sessions/batch-delete` | Bulk delete sessions |
| GET | `/api/download/[fileId]` | Download output file |
| GET | `/api/preview-output/[fileId]` | Preview output file (JSON) |
| GET | `/api/stats` | Dashboard statistics |

## Alur Sistem

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Upload  │───▶│  Parse   │───▶│  Store   │───▶│  Queue   │
│  3 files │    │  Excel   │    │  to DB   │    │  Inngest │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ Download │◀───│ Generate │◀───│Transform │◀───│ Validate │
│  Output  │    │  Excel   │    │  Data    │    │  Rows    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

1. **Upload**: User upload 3 file Excel (SALES DAILY, SALES MP, SALES PRODUK)
2. **Parse**: Sistem parse Excel ke JSON (streaming untuk file >10MB)
3. **Store**: Data mentah disimpan ke `sales_raw` table (chunk 500 rows)
4. **Queue**: Inngest event dikirim untuk proses async
5. **Validate**: Setiap baris divalidasi berdasarkan `validation_rules` di DB
6. **Transform**: Data ditransformasi via `column_mappings` di DB
7. **Generate**: Generate FINANCE.xlsx (16 kolom) dan MARKETING.xlsx (20 kolom)
8. **Download**: User download atau preview file output

## Format Input

### SALES DAILY.xlsx
- Data penjualan harian
- Kolom: No, Date, Group, Kanal, MetodeBayar, Toko, ADV, TypeTransaksi, OrderNumber, dll

### SALES MP.xlsx
- Data marketplace (Shopee, TikTok Shop)
- Kolom: No, Date, Group, Kanal, MetodeBayar, Toko, TypeTransaksi, OrderNumber, dll
- Catatan: Tidak memiliki kolom Advertiser dan TaxName

### SALES Produk.xlsx
- Data produk (TikTok Shop)
- Kolom: No, Date, Group, Kanal, MetodeBayar, Toko, ADV, TypeTransaksi, OrderNumber, dll
- Catatan: Tidak memiliki kolom TaxName

## Format Output

### FINANCE.xlsx (16 kolom)
| Kolom | Keterangan |
|-------|------------|
| Tanggal Closing | Tanggal closing transaksi |
| Tanggal Pesanan | Tanggal pemesanan |
| No. Invoice | Nomor invoice |
| No Resi | Nomor resi pengiriman |
| Ekspedisi | Nama ekspedisi |
| Type Transaksi | NC/RN/RC |
| Advertiser | Nama advertiser |
| Platform | WEB/SHOPEE/TIKTOK SHOP |
| Nama Toko | Nama toko |
| Produk Name | Nama produk |
| Jumlah | Jumlah item |
| Omzet | Total harga jual |
| HPP Sigma | Harga Pokok Penjualan |
| TaxName(%) | Kode promo/diskon |
| Total Bayar | Total pembayaran |
| Payment type | Metode pembayaran |

### MARKETING.xlsx (20 kolom)
| Kolom | Keterangan |
|-------|------------|
| Tahun | Tahun transaksi |
| Bulan | Bulan transaksi |
| Tanggal Closing | Tanggal closing |
| Tanggal Pesanan | Tanggal pemesanan |
| No. Invoice | Nomor invoice |
| No. Resi | Nomor resi |
| Memo | Kode promo |
| Region | Region pengiriman (auto-detect) |
| Ekspedisi | Nama ekspedisi |
| Advertiser | Nama advertiser |
| Platform | Platform penjualan |
| Nama Toko | Nama toko |
| Produk | Nama produk |
| Jumlah | Jumlah item |
| Omzet | Total harga jual |
| HPP | Harga Pokok Penjualan |
| Kode Promo | Kode promo |
| Total Bayar | Total pembayaran |
| Metode Pembayaran | Metode pembayaran |
| SKU | Kode SKU |

## Troubleshooting

### Inngest tidak sinkron
- Pastikan App URL benar di Inngest Dashboard → Sync
- Format: `https://your-app.vercel.app/api/inngest` (atau `http://localhost:3000/api/inngest` untuk development)
- Klik "Sync App" setelah memasukkan URL

### Upload gagal
- Pastikan file memiliki header di baris pertama
- Format file harus .xlsx atau .xls
- Ukuran file maksimal tergantung memori server

### Proses stuck di "processing"
- Cek Inngest Dashboard untuk status function execution
- Jika gagal, Inngest akan auto-retry (max 3 kali)
- Gunakan tombol "Upload Ulang" untuk rollback dan coba lagi

## License

MIT
