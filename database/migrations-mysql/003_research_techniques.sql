-- EmotioxV3 Database Migration - Research Techniques (MySQL)
-- Version: 1.0.1
-- Description: Adds research_techniques table and updates research_types to reference it

-- ==========================================
-- RESEARCH TECHNIQUES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS research_techniques (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_research_techniques_name (name),
    INDEX idx_research_techniques_active (is_active),
    INDEX idx_research_techniques_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- UPDATE RESEARCH TYPES TABLE
-- ==========================================

-- Add column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'research_types' AND COLUMN_NAME = 'research_technique_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE research_types ADD COLUMN research_technique_id CHAR(36)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if it doesn't exist
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'research_types' AND INDEX_NAME = 'idx_research_types_technique_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_research_types_technique_id ON research_types(research_technique_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'research_types' AND CONSTRAINT_NAME = 'fk_research_types_technique');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE research_types ADD CONSTRAINT fk_research_types_technique FOREIGN KEY (research_technique_id) REFERENCES research_techniques(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
