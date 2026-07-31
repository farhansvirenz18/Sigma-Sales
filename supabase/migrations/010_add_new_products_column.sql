-- ============================================
-- ADD new_products column to upload_sessions
-- ============================================

ALTER TABLE upload_sessions
ADD COLUMN IF NOT EXISTS new_products jsonb DEFAULT '[]'::jsonb;
