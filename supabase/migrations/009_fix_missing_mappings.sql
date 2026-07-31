-- ============================================
-- FIX: Missing mappings + duplicate cleanup
-- ============================================

-- 1. SALES_PRODUK → MARKETING: tambah Note → Memo
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_PRODUK', 'Note', 'marketing', 'Memo', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_PRODUK' AND source_column = 'Note' AND target_table = 'marketing' AND target_column = 'Memo'
);

-- 2. SALES_PRODUK → MARKETING: tambah Note → Kode Promo
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_PRODUK', 'Note', 'marketing', 'Kode Promo', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_PRODUK' AND source_column = 'Note' AND target_table = 'marketing' AND target_column = 'Kode Promo'
);

-- 3. SALES_PRODUK → MARKETING: tambah ProvinsiCustomer → Region
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_PRODUK', 'ProvinsiCustomer', 'marketing', 'Region', '{"type": "region_map"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_PRODUK' AND source_column = 'ProvinsiCustomer' AND target_table = 'marketing' AND target_column = 'Region'
);

-- 4. SALES_PRODUK → MARKETING: tambah MetodeBayar → Metode Pembayaran
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_PRODUK', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_PRODUK' AND source_column = 'MetodeBayar' AND target_table = 'marketing' AND target_column = 'Metode Pembayaran'
);

-- 5. SALES_MP → MARKETING: tambah Note → Memo
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'Note', 'marketing', 'Memo', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP' AND source_column = 'Note' AND target_table = 'marketing' AND target_column = 'Memo'
);

-- 6. SALES_MP → MARKETING: tambah Note → Kode Promo
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'Note', 'marketing', 'Kode Promo', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP' AND source_column = 'Note' AND target_table = 'marketing' AND target_column = 'Kode Promo'
);

-- 7. SALES_MP → MARKETING: tambah ProvinsiCustomer → Region
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'ProvinsiCustomer', 'marketing', 'Region', '{"type": "region_map"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP' AND source_column = 'ProvinsiCustomer' AND target_table = 'marketing' AND target_column = 'Region'
);

-- 8. Hapus duplicate TypeTransaksi mapping untuk SALES_MP → FINANCE
DELETE FROM column_mappings
WHERE source_file = 'SALES_MP'
  AND source_column = 'TypeTransaksi'
  AND target_table = 'finance'
  AND target_column = 'Type Transaksi'
  AND id NOT IN (
    SELECT MIN(id) FROM column_mappings
    WHERE source_file = 'SALES_MP'
      AND source_column = 'TypeTransaksi'
      AND target_table = 'finance'
      AND target_column = 'Type Transaksi'
    GROUP BY source_file, source_column, target_table, target_column
  );
