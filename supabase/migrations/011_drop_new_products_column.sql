-- ============================================
-- DROP new_products column from upload_sessions
-- ============================================

ALTER TABLE upload_sessions
DROP COLUMN IF EXISTS new_products;
