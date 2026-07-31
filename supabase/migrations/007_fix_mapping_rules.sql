-- ============================================
-- FIX: SALES_PRODUK Platform + SALES_MP mappings
-- ============================================

-- 1. Fix SALES_PRODUK → finance Platform mapping (tambah "A": "WEB")
UPDATE column_mappings
SET transform_rule = '{"type": "map", "mapping": {"A": "WEB", "Tiktok Shop": "TIKTOK SHOP"}}'
WHERE source_file = 'SALES_PRODUK'
  AND source_column = 'Kanal'
  AND target_table = 'finance'
  AND target_column = 'Platform';

-- 2. Fix SALES_PRODUK → marketing Platform mapping (tambah "A": "WEB")
UPDATE column_mappings
SET transform_rule = '{"type": "map", "mapping": {"A": "WEB", "Tiktok Shop": "TIKTOK SHOP"}}'
WHERE source_file = 'SALES_PRODUK'
  AND source_column = 'Kanal'
  AND target_table = 'marketing'
  AND target_column = 'Platform';

-- 3. Add SALES_MP → finance TypeTransaksi mapping (belum ada)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP'
    AND source_column = 'TypeTransaksi'
    AND target_table = 'finance'
    AND target_column = 'Type Transaksi'
);

-- 4. Add SALES_MP → marketing MetodeBayar mapping (belum ada)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP'
    AND source_column = 'MetodeBayar'
    AND target_table = 'marketing'
    AND target_column = 'Metode Pembayaran'
);
