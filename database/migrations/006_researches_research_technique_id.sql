-- EmotioxV3 Database Migration - Research Technique ID in Researches
-- Version: 1.0.4
-- Description: Adds research_technique_id column to researches table

-- ==========================================
-- UPDATE RESEARCHES TABLE
-- ==========================================
ALTER TABLE researches
ADD COLUMN IF NOT EXISTS research_technique_id UUID REFERENCES research_techniques(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_researches_research_technique_id ON researches(research_technique_id);

COMMENT ON COLUMN researches.research_technique_id IS 'Reference to the research technique used in this research';

