-- Fix: Drop constraint lama dan buat baru
ALTER TABLE column_mappings DROP CONSTRAINT IF EXISTS column_mappings_source_file_source_column_target_table_key;

-- Unique constraint baru (include target_column)
ALTER TABLE column_mappings ADD CONSTRAINT column_mappings_unique UNIQUE(source_file, source_column, target_table, target_column);
