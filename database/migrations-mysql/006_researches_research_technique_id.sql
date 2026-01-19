-- EmotioxV3 Database Migration - Research Technique ID in Researches (MySQL)
-- Version: 1.0.4
-- Description: Adds research_technique_id column to researches table

-- ==========================================
-- UPDATE RESEARCHES TABLE
-- ==========================================

-- Add column if it doesn't exist (MySQL compatible)
SET @column_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'researches'
    AND COLUMN_NAME = 'research_technique_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE researches ADD COLUMN research_technique_id CHAR(36)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if it doesn't exist
SET @index_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'researches'
    AND INDEX_NAME = 'idx_researches_research_technique_id'
);

SET @sql = IF(@index_exists = 0,
    'CREATE INDEX idx_researches_research_technique_id ON researches(research_technique_id)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key if it doesn't exist
SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'researches'
    AND CONSTRAINT_NAME = 'fk_researches_research_technique'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE researches ADD CONSTRAINT fk_researches_research_technique FOREIGN KEY (research_technique_id) REFERENCES research_techniques(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
