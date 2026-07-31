-- ============================================
-- SEED DATA: Products, Prices, Mappings, Rules
-- ============================================

-- Products
INSERT INTO products (code, name, category) VALUES
('PR01', 'PRODUK SATU', 'Regular'),
('BRG01', 'BARANG SATU', 'Regular'),
('BDL01', 'BOXL A', 'Bundle'),
('BDL02', 'BOXL B', 'Bundle');

-- Product Prices
INSERT INTO product_prices (product_code, platform, hpp) VALUES
('PR01', 'WEB', 56000),
('PR01', 'SHOPEE', 84000),
('PR01', 'TIKTOK SHOP', 70000),
('BRG01', 'WEB', 72000),
('BRG01', 'SHOPEE', 85000),
('BDL01', 'TIKTOK SHOP', 27000),
('BDL02', 'TIKTOK SHOP', 22500);

-- Column Mappings: SALES_DAILY → FINANCE
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_DAILY', 'Date', 'finance', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_DAILY', 'Date', 'finance', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_DAILY', 'OrderNumber', 'finance', 'No. Invoice', '{"type": "direct"}'),
('SALES_DAILY', 'Awb', 'finance', 'No Resi', '{"type": "direct"}'),
('SALES_DAILY', 'Ekspedisi', 'finance', 'Ekspedisi', '{"type": "direct"}'),
('SALES_DAILY', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'),
('SALES_DAILY', 'ADV', 'finance', 'Advertiser', '{"type": "direct"}'),
('SALES_DAILY', 'Kanal', 'finance', 'Platform', '{"type": "map", "mapping": {"A": "WEB", "B": "SHOPEE"}}'),
('SALES_DAILY', 'Toko', 'finance', 'Nama Toko', '{"type": "direct"}'),
('SALES_DAILY', 'ProductCode', 'finance', 'Produk Name', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_DAILY', 'Quantity', 'finance', 'Jumlah', '{"type": "number"}'),
('SALES_DAILY', 'Totalperline', 'finance', 'Omzet', '{"type": "number"}'),
('SALES_DAILY', 'Note', 'finance', 'TaxName(%)', '{"type": "direct"}'),
('SALES_DAILY', 'MetodeBayar', 'finance', 'Payment type', '{"type": "map", "mapping": {"TF": "Transfer", "COD": "COD"}}');

-- Column Mappings: SALES_DAILY → MARKETING
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
('SALES_DAILY', 'Note', 'marketing', 'Kode Promo', '{"type": "direct"}'),
('SALES_DAILY', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}');

-- Column Mappings: SALES_MP → FINANCE
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_MP', 'Date', 'finance', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_MP', 'Date', 'finance', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_MP', 'OrderNumber', 'finance', 'No. Invoice', '{"type": "direct"}'),
('SALES_MP', 'Awb', 'finance', 'No Resi', '{"type": "direct"}'),
('SALES_MP', 'Ekspedisi', 'finance', 'Ekspedisi', '{"type": "direct"}'),
('SALES_MP', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'),
('SALES_MP', 'ADV', 'finance', 'Advertiser', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'finance', 'Platform', '{"type": "map", "mapping": {"SHOPEE": "SHOPEE"}}'),
('SALES_MP', 'Toko', 'finance', 'Nama Toko', '{"type": "direct"}'),
('SALES_MP', 'ProductCode', 'finance', 'Produk Name', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_MP', 'Quantity', 'finance', 'Jumlah', '{"type": "number"}'),
('SALES_MP', 'Totalperline', 'finance', 'Omzet', '{"type": "number"}'),
('SALES_MP', 'MetodeBayar', 'finance', 'Payment type', '{"type": "map", "mapping": {"TF": "Transfer", "COD": "COD"}}');

-- Column Mappings: SALES_MP → MARKETING
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_MP', 'Date', 'marketing', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_MP', 'Date', 'marketing', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_MP', 'OrderNumber', 'marketing', 'No. Invoice', '{"type": "direct"}'),
('SALES_MP', 'Awb', 'marketing', 'No Resi', '{"type": "direct"}'),
('SALES_MP', 'Note', 'marketing', 'Memo', '{"type": "direct"}'),
('SALES_MP', 'ProvinsiCustomer', 'marketing', 'Region', '{"type": "region_map"}'),
('SALES_MP', 'Ekspedisi', 'marketing', 'Ekspedisi', '{"type": "direct"}'),
('SALES_MP', 'ADV', 'marketing', 'Advertiser', '{"type": "direct"}'),
('SALES_MP', 'Kanal', 'marketing', 'Platform', '{"type": "map", "mapping": {"SHOPEE": "SHOPEE"}}'),
('SALES_MP', 'Toko', 'marketing', 'Nama Toko', '{"type": "direct"}'),
('SALES_MP', 'ProductCode', 'marketing', 'Produk', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_MP', 'Quantity', 'marketing', 'Jumlah', '{"type": "number"}'),
('SALES_MP', 'Totalperline', 'marketing', 'Omzet', '{"type": "number"}'),
('SALES_MP', 'Note', 'marketing', 'Kode Promo', '{"type": "direct"}'),
('SALES_MP', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}');

-- Column Mappings: SALES_PRODUK → FINANCE
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_PRODUK', 'Date', 'finance', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_PRODUK', 'Date', 'finance', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_PRODUK', 'OrderNumber', 'finance', 'No. Invoice', '{"type": "direct"}'),
('SALES_PRODUK', 'Awb', 'finance', 'No Resi', '{"type": "direct"}'),
('SALES_PRODUK', 'Ekspedisi', 'finance', 'Ekspedisi', '{"type": "direct"}'),
('SALES_PRODUK', 'TypeTransaksi', 'finance', 'Type Transaksi', '{"type": "direct"}'),
('SALES_PRODUK', 'ADV', 'finance', 'Advertiser', '{"type": "direct"}'),
('SALES_PRODUK', 'Kanal', 'finance', 'Platform', '{"type": "map", "mapping": {"A": "WEB", "Tiktok Shop": "TIKTOK SHOP"}}'),
('SALES_PRODUK', 'Toko', 'finance', 'Nama Toko', '{"type": "direct"}'),
('SALES_PRODUK', 'ProductCode', 'finance', 'Produk Name', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_PRODUK', 'Quantity', 'finance', 'Jumlah', '{"type": "number"}'),
('SALES_PRODUK', 'Totalperline', 'finance', 'Omzet', '{"type": "number"}'),
('SALES_PRODUK', 'MetodeBayar', 'finance', 'Payment type', '{"type": "map", "mapping": {"TF": "Transfer", "COD": "COD"}}');

-- Column Mappings: SALES_PRODUK → MARKETING
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule) VALUES
('SALES_PRODUK', 'Date', 'marketing', 'Tanggal Closing', '{"type": "date_format"}'),
('SALES_PRODUK', 'Date', 'marketing', 'Tanggal Pesanan', '{"type": "date_format"}'),
('SALES_PRODUK', 'OrderNumber', 'marketing', 'No. Invoice', '{"type": "direct"}'),
('SALES_PRODUK', 'Awb', 'marketing', 'No Resi', '{"type": "direct"}'),
('SALES_PRODUK', 'Note', 'marketing', 'Memo', '{"type": "direct"}'),
('SALES_PRODUK', 'ProvinsiCustomer', 'marketing', 'Region', '{"type": "region_map"}'),
('SALES_PRODUK', 'Ekspedisi', 'marketing', 'Ekspedisi', '{"type": "direct"}'),
('SALES_PRODUK', 'ADV', 'marketing', 'Advertiser', '{"type": "direct"}'),
('SALES_PRODUK', 'Kanal', 'marketing', 'Platform', '{"type": "map", "mapping": {"A": "WEB", "Tiktok Shop": "TIKTOK SHOP"}}'),
('SALES_PRODUK', 'Toko', 'marketing', 'Nama Toko', '{"type": "direct"}'),
('SALES_PRODUK', 'ProductCode', 'marketing', 'Produk', '{"type": "lookup", "table": "products", "field": "name"}'),
('SALES_PRODUK', 'Quantity', 'marketing', 'Jumlah', '{"type": "number"}'),
('SALES_PRODUK', 'Totalperline', 'marketing', 'Omzet', '{"type": "number"}'),
('SALES_PRODUK', 'Note', 'marketing', 'Kode Promo', '{"type": "direct"}'),
('SALES_PRODUK', 'MetodeBayar', 'marketing', 'Metode Pembayaran', '{"type": "direct"}');

-- Validation Rules: SALES_DAILY
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message) VALUES
('SALES_DAILY', 'OrderNumber', 'required', '{"type": "required"}', 'Order number wajib diisi'),
('SALES_DAILY', 'Date', 'required', '{"type": "required"}', 'Tanggal wajib diisi'),
('SALES_DAILY', 'ProductCode', 'required', '{"type": "required"}', 'Kode produk wajib diisi'),
('SALES_DAILY', 'ProductCode', 'lookup', '{"type": "lookup", "table": "products", "field": "code"}', 'Kode produk tidak terdaftar di database'),
('SALES_DAILY', 'Kanal', 'required', '{"type": "required"}', 'Kanal wajib diisi'),
('SALES_DAILY', 'Quantity', 'required', '{"type": "required"}', 'Quantity wajib diisi'),
('SALES_DAILY', 'Quantity', 'type', '{"type": "type", "data_type": "number"}', 'Quantity harus berupa angka'),
('SALES_DAILY', 'Quantity', 'range', '{"type": "range", "min": 1, "max": 9999}', 'Quantity harus antara 1-9999'),
('SALES_DAILY', 'UnitPrice', 'type', '{"type": "type", "data_type": "number"}', 'Harga satuan harus berupa angka'),
('SALES_DAILY', 'Totalperline', 'required', '{"type": "required"}', 'Total per line wajib diisi'),
('SALES_DAILY', 'Totalperline', 'type', '{"type": "type", "data_type": "number"}', 'Total per line harus berupa angka');

-- Validation Rules: SALES_MP
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message) VALUES
('SALES_MP', 'OrderNumber', 'required', '{"type": "required"}', 'Order number wajib diisi'),
('SALES_MP', 'Date', 'required', '{"type": "required"}', 'Tanggal wajib diisi'),
('SALES_MP', 'ProductCode', 'required', '{"type": "required"}', 'Kode produk wajib diisi'),
('SALES_MP', 'ProductCode', 'lookup', '{"type": "lookup", "table": "products", "field": "code"}', 'Kode produk tidak terdaftar di database'),
('SALES_MP', 'Kanal', 'required', '{"type": "required"}', 'Kanal wajib diisi'),
('SALES_MP', 'Quantity', 'required', '{"type": "required"}', 'Quantity wajib diisi'),
('SALES_MP', 'Quantity', 'type', '{"type": "type", "data_type": "number"}', 'Quantity harus berupa angka'),
('SALES_MP', 'Totalperline', 'required', '{"type": "required"}', 'Total per line wajib diisi'),
('SALES_MP', 'Totalperline', 'type', '{"type": "type", "data_type": "number"}', 'Total per line harus berupa angka');

-- Validation Rules: SALES_PRODUK
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message) VALUES
('SALES_PRODUK', 'OrderNumber', 'required', '{"type": "required"}', 'Order number wajib diisi'),
('SALES_PRODUK', 'Date', 'required', '{"type": "required"}', 'Tanggal wajib diisi'),
('SALES_PRODUK', 'ProductCode', 'required', '{"type": "required"}', 'Kode produk wajib diisi'),
('SALES_PRODUK', 'ProductCode', 'lookup', '{"type": "lookup", "table": "products", "field": "code"}', 'Kode produk tidak terdaftar di database'),
('SALES_PRODUK', 'Kanal', 'required', '{"type": "required"}', 'Kanal wajib diisi'),
('SALES_PRODUK', 'Quantity', 'required', '{"type": "required"}', 'Quantity wajib diisi'),
('SALES_PRODUK', 'Quantity', 'type', '{"type": "type", "data_type": "number"}', 'Quantity harus berupa angka'),
('SALES_PRODUK', 'Totalperline', 'required', '{"type": "required"}', 'Total per line wajib diisi'),
('SALES_PRODUK', 'Totalperline', 'type', '{"type": "type", "data_type": "number"}', 'Total per line harus berupa angka');
