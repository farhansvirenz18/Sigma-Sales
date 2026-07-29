# Sigma Sales - Data Processing System

Sistem otomatis untuk import dan transformasi data sales dari 3 file Excel menjadi 2 file output (FINANCE.xlsx dan MARKETING.xlsx).

## Tech Stack

- **Frontend**: Next.js 14+ (React) + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase PostgreSQL
- **Queue**: Inngest (serverless background jobs)
- **Storage**: Supabase Storage
- **Deployment**: Vercel

## Fitur

- Upload 3 file Excel sekaligus (drag & drop)
- Validasi data otomatis berbasis database
- Transformasi data fleksibel via column mapping
- Generate 2 file output (FINANCE & MARKETING)
- Real-time progress tracking
- History log dan error report
- Dashboard statistik

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/your-repo/sigma-sales.git
cd sigma-sales
npm install
```

### 2. Environment Variables

Copy `.env.example` ke `.env.local` dan isi:

```bash
cp .env.example .env.local
```

Isi nilai berikut:
- `NEXT_PUBLIC_SUPABASE_URL` - URL Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key Supabase
- `INNGEST_EVENT_KEY` - Inngest event key
- `INNGEST_SIGNING_KEY` - Inngest signing key

### 3. Database Setup

Buka Supabase Dashboard dan jalankan SQL migration:

1. Buka SQL Editor di Supabase
2. Jalankan `supabase/migrations/001_initial_schema.sql`
3. Jalankan `supabase/migrations/002_seed_data.sql`

### 4. Storage Setup

Buat bucket di Supabase Storage:
1. Buka Storage di Supabase Dashboard
2. Create bucket baru: `output-files`
3. Set public: false

### 5. Inngest Setup

1. Buat akun di [inngest.com](https://inngest.com)
2. Buat project baru
3. Copy event key dan signing key ke `.env.local`
4. Set serve URL: `https://your-app.vercel.app/api/inngest`

### 6. Run Development

```bash
npm run dev
```

Buka http://localhost:3000

## Struktur Project

```
sigma-sales/
├── src/
│   ├── app/              # Next.js App Router pages & API
│   ├── components/       # React components
│   ├── inngest/          # Inngest queue functions
│   ├── lib/              # Utility libraries
│   └── types/            # TypeScript types
├── supabase/
│   └── migrations/       # Database SQL migrations
├── docs/                 # Documentation
└── public/               # Static assets
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload 3 Excel files |
| GET | /api/sessions | List all sessions |
| GET | /api/sessions/[id] | Get session detail |
| GET | /api/download/[fileId] | Download output file |
| GET | /api/stats | Dashboard statistics |

## Alur Sistem

1. **Upload**: User upload 3 file Excel
2. **Parse**: Sistem parse Excel ke JSON
3. **Store**: Data mentah disimpan ke database
4. **Validate**: Validasi setiap baris via rules di database
5. **Transform**: Transformasi data sesuai column mapping
6. **Generate**: Generate FINANCE.xlsx dan MARKETING.xlsx
7. **Download**: User download file output

## Format Input

### SALES DAILY.xlsx
- Data penjualan harian
- Kolom: No, Date, Group, Kanal, MetodeBayar, Toko, ADV, TypeTransaksi, OrderNumber, dll

### SALES MP.xlsx
- Data marketplace (Shopee, dll)
- Kolom: No, Date, Group, Kanal, MetodeBayar, Toko, TypeTransaksi, OrderNumber, dll

### SALES Produk.xlsx
- Data produk (TikTok Shop)
- Kolom: No, Date, Group, Kanal, MetodeBayar, Toko, ADV, TypeTransaksi, OrderNumber, dll

## Format Output

### FINANCE.xlsx
- Format untuk tim finance
- Kolom: Tanggal Closing, Tanggal Pesanan, No. Invoice, No Resi, Ekspedisi, dll

### MARKETING.xlsx
- Format untuk tim marketing
- Kolom: Tahun, Bulan, Tanggal Closing, No. Invoice, Memo, Region, dll

## License

MIT
