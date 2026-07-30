-- ============================================
-- FIX: Update column mappings untuk SALES MP
-- ============================================

-- Hapus mapping lama yang salah untuk SALES MP
DELETE FROM column_mappings WHERE source_file = 'SALES_MP';

-- Mapping SALES_MP → FINANCE (tanpa Admin)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_MP', 'Date', 'finance', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_MP', 'Date', 'finance', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_MP', 'OrderNumber', 'finance', 'No. Invoice', '{"type": "direct"}'),
('SALES_MP', 'Awb', 'finance', 'No Resi', '{"type": "direct"}'),
('SALES_MP', 'Ekspedisi', 'finance', 'Ekspedisi', '{"type": "direct"}'),
('SALES_MP', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'finance', 'Advertiser', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'finance', 'Platform', '{"type": "map", "mapping": {"SHOPEE": "SHOPEE"}}'),
('SALES_MP', 'Toko', 'finance', 'Nama Toko', '{"type": "direct"}'),
('SALES_MP', 'ProductCode', 'finance', 'Produk Name', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_MP', 'Quantity', 'finance', 'Jumlah', '{"type": "number"}'),
('SALES_MP', 'Totalperline', 'finance', 'Omzet', '{"type": "number"}'),
('SALES_MP', 'Note', 'finance', 'TaxName(%)', '{"type": "direct"}'),
('SALES_MP', 'MetodeBayar', 'finance', 'Payment type', '{"type": "map", "mapping": {"TF": "Transfer", "COD": "COD"}}');

-- Mapping SALES_MP → MARKETING (tanpa Admin)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_MP', 'Date', 'marketing', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_MP', 'Date', 'marketing', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_MP', 'OrderNumber', 'marketing', 'No. Invoice', '{"type": "direct"}'),
('SALES_MP', 'Awb', 'marketing', 'No Resi', '{"type": "direct"}'),
('SALES_MP', 'Note', 'marketing', 'Memo', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'marketing', 'Region', '{"type": "direct"}'),
('SALES_MP', 'Ekspedisi', 'marketing', 'Ekspedisi', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'marketing', 'Advertiser', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'marketing', 'Platform', '{"type": "map", "mapping": {"SHOPEE": "SHOPEE"}}'),
('SALES_MP', 'Toko', 'marketing', 'Nama Toko', '{"type": "direct"}'),
('SALES_MP', 'ProductCode', 'marketing', 'Produk', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_MP', 'Quantity', 'marketing', 'Jumlah', '{"type": "number"}'),
('SALES_MP', 'Totalperline', 'marketing', 'Omzet', '{"type": "number"}'),
('SALES_MP', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}');

-- Update mapping SALES_DAILY (tanpa Admin)
DELETE FROM column_mappings WHERE source_file = 'SALES_DAILY';

-- Mapping SALES_DAILY → FINANCE (tanpa Admin)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_DAILY', 'Date', 'finance', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_DAILY', 'Date', 'finance', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_DAILY', 'OrderNumber', 'finance', 'No. Invoice', '{"type": "direct"}'),
('SALES_DAILY', 'Awb', 'finance', 'No Resi', '{"type": "direct"}'),
('SALES_DAILY', 'Ekspedisi', 'finance', 'Ekspedisi', '{"type": "direct"}'),
('SALES_DAILY', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'),
('SALES_DAILY', 'ADV', 'finance', 'Advertiser', '{"type": "direct"}'),
('SALES_DAILY', 'Kanal', 'finance', 'Platform', '{"type": "map", "mapping": {"A": "WEB"}}'),
('SALES_DAILY', 'Toko', 'finance', 'Nama Toko', '{"type": "direct"}'),
('SALES_DAILY', 'ProductCode', 'finance', 'Produk Name', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_DAILY', 'Quantity', 'finance', 'Jumlah', '{"type": "number"}'),
('SALES_DAILY', 'Totalperline', 'finance', 'Omzet', '{"type": "number"}'),
('SALES_DAILY', 'Note', 'finance', 'TaxName(%)', '{"type": "direct"}'),
('SALES_DAILY', 'MetodeBayar', 'finance', 'Payment type', '{"type": "map", "mapping": {"TF": "Transfer", "COD": "COD"}}');

-- Mapping SALES_DAILY → MARKETING (tanpa Admin)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_DAILY', 'Date', 'marketing', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_DAILY', 'Date', 'marketing', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_DAILY', 'OrderNumber', 'marketing', 'No. Invoice', '{"type": "direct"}'),
('SALES_DAILY', 'Awb', 'marketing', 'No Resi', '{"type": "direct"}'),
('SALES_DAILY', 'Note', 'marketing', 'Memo', '{"type": "direct"}'),
('SALES_DAILY', 'ProvinsiCustomer', 'marketing', 'Region', '{"type": "region_map"}'),
('SALES_DAILY', 'Ekspedisi', 'marketing', 'Ekspedisi', '{"type": "direct"}'),
('SALES_DAILY', 'ADV', 'marketing', 'Advertiser', '{"type": "direct"}'),
('SALES_DAILY', 'Kanal', 'marketing', 'Platform', '{"type": "map", "mapping": {"A": "WEB"}}'),
('SALES_DAILY', 'Toko', 'marketing', 'Nama Toko', '{"type": "direct"}'),
('SALES_DAILY', 'ProductCode', 'marketing', 'Produk', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_DAILY', 'Quantity', 'marketing', 'Jumlah', '{"type": "number"}'),
('SALES_DAILY', 'Totalperline', 'marketing', 'Omzet', '{"type": "number"}'),
('SALES_DAILY', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}');

-- Update mapping SALES_PRODUK (tanpa Admin)
DELETE FROM column_mappings WHERE source_file = 'SALES_PRODUK';

-- Mapping SALES_PRODUK → FINANCE (tanpa Admin)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_PRODUK', 'Date', 'finance', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_PRODUK', 'Date', 'finance', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_PRODUK', 'OrderNumber', 'finance', 'No. Invoice', '{"type": "direct"}'),
('SALES_PRODUK', 'Awb', 'finance', 'No Resi', '{"type": "direct"}'),
('SALES_PRODUK', 'Ekspedisi', 'finance', 'Ekspedisi', '{"type": "direct"}'),
('SALES_PRODUK', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'),
('SALES_PRODUK', 'ADV', 'finance', 'Advertiser', '{"type": "direct"}'),
('SALES_PRODUK', 'Kanal', 'finance', 'Platform', '{"type": "map", "mapping": {"Tiktok Shop": "TIKTOK SHOP"}}'),
('SALES_PRODUK', 'Toko', 'finance', 'Nama Toko', '{"type": "direct"}'),
('SALES_PRODUK', 'ProductCode', 'finance', 'Produk Name', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_PRODUK', 'Quantity', 'finance', 'Jumlah', '{"type": "number"}'),
('SALES_PRODUK', 'Totalperline', 'finance', 'Omzet', '{"type": "number"}'),
('SALES_PRODUK', 'Note', 'finance', 'TaxName(%)', '{"type": "direct"}'),
('SALES_PRODUK', 'MetodeBayar', 'finance', 'Payment type', '{"type": "map", "mapping": {"TF": "Transfer", "COD": "COD"}}');

-- Mapping SALES_PRODUK → MARKETING (tanpa Admin)
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_PRODUK', 'Date', 'marketing', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_PRODUK', 'Date', 'marketing', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_PRODUK', 'OrderNumber', 'marketing', 'No. Invoice', '{"type": "direct"}'),
('SALES_PRODUK', 'Awb', 'marketing', 'No Resi', '{"type": "direct"}'),
('SALES_PRODUK', 'Note', 'marketing', 'Memo', '{"type": "direct"}'),
('SALES_PRODUK', 'ProvinsiCustomer', 'marketing', 'Region', '{"type": "region_map"}'),
('SALES_PRODUK', 'Ekspedisi', 'marketing', 'Ekspedisi', '{"type": "direct"}'),
('SALES_PRODUK', 'ADV', 'marketing', 'Advertiser', '{"type": "direct"}'),
('SALES_PRODUK', 'Kanal', 'marketing', 'Platform', '{"type": "map", "mapping": {"Tiktok Shop": "TIKTOK SHOP"}}'),
('SALES_PRODUK', 'Toko', 'marketing', 'Nama Toko', '{"type": "direct"}'),
('SALES_PRODUK', 'ProductCode', 'marketing', 'Produk', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_PRODUK', 'Quantity', 'marketing', 'Jumlah', '{"type": "number"}'),
('SALES_PRODUK', 'Totalperline', 'marketing', 'Omzet', '{"type": "number"}'),
('SALES_PRODUK', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}');
