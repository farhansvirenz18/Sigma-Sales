-- ============================================
-- SIGMA SALES - Database Schema
-- ============================================

-- 1. SESSIONS: Tracking setiap upload batch
CREATE TABLE upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'validating', 'processing', 'completed', 'failed', 'rolled_back')),
    total_rows INT DEFAULT 0,
    valid_rows INT DEFAULT 0,
    error_rows INT DEFAULT 0,
    files_uploaded JSONB NOT NULL DEFAULT '[]',
    error_summary JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_sessions_status ON upload_sessions(status);
CREATE INDEX idx_sessions_created ON upload_sessions(created_at DESC);

-- 2. SALES_RAW: Data mentah dari Excel
CREATE TABLE sales_raw (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    source_file TEXT NOT NULL CHECK (source_file IN ('SALES_DAILY', 'SALES_MP', 'SALES_PRODUK')),
    row_number INT NOT NULL,
    raw_data JSONB NOT NULL,
    validation_status TEXT DEFAULT 'pending'
        CHECK (validation_status IN ('pending', 'valid', 'error')),
    validation_errors JSONB DEFAULT '[]',
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_raw_session ON sales_raw(session_id);
CREATE INDEX idx_raw_source ON sales_raw(session_id, source_file);
CREATE INDEX idx_raw_status ON sales_raw(session_id, validation_status);

-- 3. PRODUCTS: Master produk
CREATE TABLE products (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. PRODUCT_PRICES: HPP per platform
CREATE TABLE product_prices (
    id BIGSERIAL PRIMARY KEY,
    product_code TEXT NOT NULL REFERENCES products(code),
    platform TEXT NOT NULL,
    hpp NUMERIC(15,2) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(product_code, platform, effective_date)
);

CREATE INDEX idx_prices_product ON product_prices(product_code);

-- 5. COLUMN_MAPPINGS: Konfigurasi mapping kolom
CREATE TABLE column_mappings (
    id BIGSERIAL PRIMARY KEY,
    source_file TEXT NOT NULL,
    source_column TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_column TEXT NOT NULL,
    transform_rule JSONB DEFAULT '{}',
    is_required BOOLEAN DEFAULT TRUE,
    default_value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_file, source_column, target_table)
);

-- 6. OUTPUT_FILES: File output yang di-generate
CREATE TABLE output_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    file_type TEXT NOT NULL CHECK (file_type IN ('FINANCE', 'MARKETING')),
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    row_count INT,
    storage_bucket TEXT DEFAULT 'output-files',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_output_session ON output_files(session_id);

-- 7. PROCESSING_LOGS: Audit trail
CREATE TABLE processing_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES upload_sessions(id) ON DELETE CASCADE,
    step TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    details JSONB DEFAULT '{}',
    error_message TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_logs_session ON processing_logs(session_id);

-- 8. VALIDATION_RULES: Rules validasi
CREATE TABLE validation_rules (
    id BIGSERIAL PRIMARY KEY,
    source_file TEXT NOT NULL,
    field_name TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    rule_config JSONB NOT NULL,
    error_message TEXT NOT NULL,
    severity TEXT DEFAULT 'error' CHECK (severity IN ('error', 'warning')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);
