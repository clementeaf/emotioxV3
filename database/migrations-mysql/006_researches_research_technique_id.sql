-- EmotioxV3 Database Migration - Research Technique ID in Researches (MySQL)
-- Version: 1.0.4
-- Description: Adds research_technique_id column to researches table

-- ==========================================
-- UPDATE RESEARCHES TABLE
-- ==========================================
ALTER TABLE researches
ADD COLUMN IF NOT EXISTS research_technique_id CHAR(36),
ADD INDEX IF NOT EXISTS idx_researches_research_technique_id (research_technique_id),
ADD FOREIGN KEY IF NOT EXISTS (research_technique_id) REFERENCES research_techniques(id) ON DELETE SET NULL;
