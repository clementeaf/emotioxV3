-- EmotioxV3 Database Migration - Enterprises (MySQL)
-- Version: 1.0.2
-- Description: Adds enterprises table and updates researches to reference it

-- ==========================================
-- ENTERPRISES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS enterprises (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_by CHAR(36),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_enterprises_name (name),
    INDEX idx_enterprises_active (is_active),
    INDEX idx_enterprises_created_by (created_by),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- UPDATE RESEARCHES TABLE
-- ==========================================

-- Add column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'researches' AND COLUMN_NAME = 'enterprise_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE researches ADD COLUMN enterprise_id CHAR(36)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if it doesn't exist
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'researches' AND INDEX_NAME = 'idx_researches_enterprise_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_researches_enterprise_id ON researches(enterprise_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'researches' AND CONSTRAINT_NAME = 'fk_researches_enterprise');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE researches ADD CONSTRAINT fk_researches_enterprise FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
