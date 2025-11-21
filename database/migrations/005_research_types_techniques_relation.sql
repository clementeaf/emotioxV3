-- EmotioxV3 Database Migration - Research Types and Techniques Many-to-Many Relation
-- Version: 1.0.3
-- Description: Creates junction table for many-to-many relationship between research_types and research_techniques

-- ==========================================
-- RESEARCH TYPES TECHNIQUES JUNCTION TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_types_techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    research_type_id UUID NOT NULL REFERENCES research_types(id) ON DELETE CASCADE,
    research_technique_id UUID NOT NULL REFERENCES research_techniques(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(research_type_id, research_technique_id)
);

CREATE INDEX idx_research_types_techniques_type_id ON research_types_techniques(research_type_id);
CREATE INDEX idx_research_types_techniques_technique_id ON research_types_techniques(research_technique_id);

COMMENT ON TABLE research_types_techniques IS 'Many-to-many relationship between research types and research techniques';
COMMENT ON COLUMN research_types_techniques.research_type_id IS 'Reference to research type';
COMMENT ON COLUMN research_types_techniques.research_technique_id IS 'Reference to research technique';

-- Migrate existing data from research_technique_id to junction table
INSERT INTO research_types_techniques (research_type_id, research_technique_id)
SELECT id, research_technique_id
FROM research_types
WHERE research_technique_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Remove the old one-to-one column (optional, commented out to preserve data)
-- ALTER TABLE research_types DROP COLUMN IF EXISTS research_technique_id;

