-- ============================================
-- FIX: SALES_MP Platform mappings missing Tiktok → TIKTOK SHOP
-- ============================================

-- SALES_MP → finance: Add Tiktok mapping
UPDATE column_mappings
SET transform_rule = '{"type": "map", "mapping": {"SHOPEE": "SHOPEE", "Tiktok": "TIKTOK SHOP", "Tiktok Shop": "TIKTOK SHOP"}}'
WHERE source_file = 'SALES_MP'
  AND target_table = 'finance'
  AND target_column = 'Platform';

-- SALES_MP → marketing: Add Tiktok mapping
UPDATE column_mappings
SET transform_rule = '{"type": "map", "mapping": {"SHOPEE": "SHOPEE", "Tiktok": "TIKTOK SHOP", "Tiktok Shop": "TIKTOK SHOP"}}'
WHERE source_file = 'SALES_MP'
  AND target_table = 'marketing'
  AND target_column = 'Platform';

-- SALES_DAILY → marketing: Add Tiktok mapping
UPDATE column_mappings
SET transform_rule = '{"type": "map", "mapping": {"A": "WEB", "Tiktok": "TIKTOK SHOP", "Tiktok Shop": "TIKTOK SHOP"}}'
WHERE source_file = 'SALES_DAILY'
  AND target_table = 'marketing'
  AND target_column = 'Platform';
