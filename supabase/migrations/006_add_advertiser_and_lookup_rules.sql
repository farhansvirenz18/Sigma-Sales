-- ============================================
-- FIX: Add missing Advertiser mappings + lookup rules
-- Safe to re-run: checks before insert
-- ============================================

-- 1. Add missing Advertiser mappings for SALES_MP → FINANCE
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'ADV', 'finance', 'Advertiser', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP' AND source_column = 'ADV'
  AND target_table = 'finance' AND target_column = 'Advertiser'
);

-- 2. Add missing Advertiser mappings for SALES_MP → MARKETING
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_MP', 'ADV', 'marketing', 'Advertiser', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_MP' AND source_column = 'ADV'
  AND target_table = 'marketing' AND target_column = 'Advertiser'
);

-- 3. Add missing Advertiser mappings for SALES_PRODUK → MARKETING
INSERT INTO column_mappings (source_file, source_column, target_table, target_column, transform_rule)
SELECT 'SALES_PRODUK', 'ADV', 'marketing', 'Advertiser', '{"type": "direct"}'
WHERE NOT EXISTS (
  SELECT 1 FROM column_mappings
  WHERE source_file = 'SALES_PRODUK' AND source_column = 'ADV'
  AND target_table = 'marketing' AND target_column = 'Advertiser'
);

-- 4. Add lookup validation rules for ProductCode
INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_DAILY', 'ProductCode', 'lookup', '{"type": "lookup", "table": "products", "field": "code"}', 'Kode produk tidak terdaftar di database'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_DAILY' AND field_name = 'ProductCode' AND rule_type = 'lookup'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_MP', 'ProductCode', 'lookup', '{"type": "lookup", "table": "products", "field": "code"}', 'Kode produk tidak terdaftar di database'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_MP' AND field_name = 'ProductCode' AND rule_type = 'lookup'
);

INSERT INTO validation_rules (source_file, field_name, rule_type, rule_config, error_message)
SELECT 'SALES_PRODUK', 'ProductCode', 'lookup', '{"type": "lookup", "table": "products", "field": "code"}', 'Kode produk tidak terdaftar di database'
WHERE NOT EXISTS (
  SELECT 1 FROM validation_rules
  WHERE source_file = 'SALES_PRODUK' AND field_name = 'ProductCode' AND rule_type = 'lookup'
);
