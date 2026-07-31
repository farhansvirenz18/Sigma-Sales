-- ============================================
-- ADD REQUIRED RULES: Kanal, Quantity, Totalperline
-- ============================================

-- SALES_DAILY: tambah required rules
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_DAILY', 'Kanal', 'required', '{"type": "required"}', 'Kanal wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_DAILY' AND field_name = 'Kanal' AND rule_type = 'required'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_DAILY', 'Quantity', 'required', '{"type": "required"}', 'Quantity wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_DAILY' AND field_name = 'Quantity' AND rule_type = 'required'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_DAILY', 'Totalperline', 'required', '{"type": "required"}', 'Total per line wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_DAILY' AND field_name = 'Totalperline' AND rule_type = 'required'
);

-- SALES_MP: tambah required rules
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_MP', 'Kanal', 'required', '{"type": "required"}', 'Kanal wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_MP' AND field_name = 'Kanal' AND rule_type = 'required'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_MP', 'Quantity', 'required', '{"type": "required"}', 'Quantity wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_MP' AND field_name = 'Quantity' AND rule_type = 'required'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_MP', 'Totalperline', 'required', '{"type": "required"}', 'Total per line wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_MP' AND field_name = 'Totalperline' AND rule_type = 'required'
);

-- SALES_PRODUK: tambah required rules
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_PRODUK', 'Kanal', 'required', '{"type": "required"}', 'Kanal wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_PRODUK' AND field_name = 'Kanal' AND rule_type = 'required'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_PRODUK', 'Quantity', 'required', '{"type": "required"}', 'Quantity wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_PRODUK' AND field_name = 'Quantity' AND rule_type = 'required'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_PRODUK', 'Totalperline', 'required', '{"type": "required"}', 'Total per line wajib diisi'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_PRODUK' AND field_name = 'Totalperline' AND rule_type = 'required'
);
