-- EmotioxV3 Database Migration - Research Techniques
-- Version: 1.0.1
-- Description: Adds research_techniques table and updates research_types to reference it

-- ==========================================
-- RESEARCH TECHNIQUES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_research_techniques_name ON research_techniques(name);
CREATE INDEX idx_research_techniques_active ON research_techniques(is_active);
CREATE INDEX idx_research_techniques_created_by ON research_techniques(created_by);

COMMENT ON TABLE research_techniques IS 'Research techniques catalog managed by admins';
COMMENT ON COLUMN research_techniques.name IS 'Name of the research technique';
COMMENT ON COLUMN research_techniques.description IS 'Detailed description of the research technique';

-- ==========================================
-- UPDATE RESEARCH TYPES TABLE
-- ==========================================
ALTER TABLE research_types
ADD COLUMN IF NOT EXISTS research_technique_id UUID REFERENCES research_techniques(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_research_types_technique_id ON research_types(research_technique_id);

COMMENT ON COLUMN research_types.research_technique_id IS 'Reference to the research technique used';

