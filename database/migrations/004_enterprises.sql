-- EmotioxV3 Database Migration - Enterprises
-- Version: 1.0.2
-- Description: Adds enterprises table and updates researches to reference it

-- ==========================================
-- ENTERPRISES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS enterprises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_enterprises_name ON enterprises(name);
CREATE INDEX idx_enterprises_active ON enterprises(is_active);
CREATE INDEX idx_enterprises_created_by ON enterprises(created_by);

COMMENT ON TABLE enterprises IS 'Enterprises/Companies catalog';
COMMENT ON COLUMN enterprises.name IS 'Name of the enterprise';
COMMENT ON COLUMN enterprises.description IS 'Description of the enterprise';

-- ==========================================
-- UPDATE RESEARCHES TABLE
-- ==========================================
ALTER TABLE researches
ADD COLUMN IF NOT EXISTS enterprise_id UUID REFERENCES enterprises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_researches_enterprise_id ON researches(enterprise_id);

COMMENT ON COLUMN researches.enterprise_id IS 'Reference to the enterprise associated with the research';

