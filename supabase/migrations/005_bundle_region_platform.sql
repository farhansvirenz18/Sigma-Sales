-- ============================================
-- MIGRATION 005: Bundle Items, Region/Platform Config, Duplicate Prevention
-- ============================================

-- 1. BUNDLE_ITEMS: Komposisi produk bundle
CREATE TABLE IF NOT EXISTS bundle_items (
    id BIGSERIAL PRIMARY KEY,
    bundle_code TEXT NOT NULL REFERENCES products(code) ON DELETE CASCADE,
    child_product_code TEXT NOT NULL REFERENCES products(code) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(bundle_code, child_product_code)
);

CREATE INDEX idx_bundle_items_code ON bundle_items(bundle_code);

-- 2. REGION_CONFIG: Mapping provinsi → region (configurable via DB)
CREATE TABLE IF NOT EXISTS region_config (
    id BIGSERIAL PRIMARY KEY,
    province_pattern TEXT NOT NULL,
    region TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_region_config_active ON region_config(is_active);

-- 3. PLATFORM_CONFIG: Resolusi platform dari Kanal/Platform values
CREATE TABLE IF NOT EXISTS platform_config (
    id BIGSERIAL PRIMARY KEY,
    source_pattern TEXT NOT NULL,
    target_platform TEXT NOT NULL,
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_platform_config_active ON platform_config(is_active);

-- 4. UPLOAD_SESSIONS: Add file_hash untuk duplicate detection
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_hash ON upload_sessions(file_hash);

-- Seed: Region Config
INSERT INTO region_config (province_pattern, region) VALUES
('%Jawa Timur%', 'JAWA'),
('%Jawa Barat%', 'JAWA'),
('%Jawa Tengah%', 'JAWA'),
('%DKI Jakarta%', 'JAWA'),
('%Banten%', 'JAWA'),
('%Jawa%', 'JAWA'),
('%Sumatera%', 'SUMATERA'),
('%Kalimantan%', 'KALIMANTAN'),
('%Sulawesi%', 'SULAWESI'),
('%Bali%', 'BALI'),
('%NTB%', 'BALI'),
('%NTT%', 'BALI'),
('%Papua%', 'PAPUA'),
('%Maluku%', 'MALUKU');

-- Seed: Platform Config
INSERT INTO platform_config (source_pattern, target_platform, priority) VALUES
('%SHOPEE%', 'SHOPEE', 2),
('%TIKTOK%', 'TIKTOK SHOP', 2),
('%TIKTOK SHOP%', 'TIKTOK SHOP', 3),
('%LAZADA%', 'LAZADA', 1),
('%TOKOPEDIA%', 'TOKOPEDIA', 1),
('%BLIBLI%', 'BLIBLI', 1),
('%WEB%', 'WEB', 0),
('%COD%', 'WEB', 0),
('%TRANSFER%', 'WEB', 0);

-- Seed: Bundle Items
INSERT INTO bundle_items (bundle_code, child_product_code, quantity) VALUES
('BDL01', 'PR01', 1),
('BDL01', 'BRG01', 1),
('BDL02', 'PR01', 2);
