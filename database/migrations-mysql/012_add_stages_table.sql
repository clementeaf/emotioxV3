-- EmotioxV3 Database Migration - Add Stages Table (MySQL)
-- Version: 012
-- Description: Ensures stages table exists and adds stage_id to modules
-- NOTE: The stages table is already created in 001_initial_schema.sql with display_order column

-- ==========================================
-- 1. ADD stage_type COLUMN IF NOT EXISTS
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stages' AND COLUMN_NAME = 'stage_type');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE stages ADD COLUMN stage_type VARCHAR(50) DEFAULT ''custom''', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. ADD stage_id COLUMN TO MODULES (if not exists)
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modules' AND COLUMN_NAME = 'stage_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE modules ADD COLUMN stage_id CHAR(36)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 3. CREATE DEFAULT STAGE FOR EXISTING MODULES
-- ==========================================
-- For each research that has modules without stage_id, create a default stage
-- Using display_order (from 001_initial_schema) instead of order_index
INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
SELECT UUID(), research_id, 'Default Stage', 'Auto-created stage for existing modules', 1, 'custom'
FROM modules
WHERE stage_id IS NULL
GROUP BY research_id
ON DUPLICATE KEY UPDATE id=id;

-- Assign all modules to their research's default stage
UPDATE modules m
INNER JOIN stages s ON m.research_id = s.research_id AND s.name = 'Default Stage'
SET m.stage_id = s.id
WHERE m.stage_id IS NULL;

-- ==========================================
-- 4. ADD FOREIGN KEY CONSTRAINT (if not exists)
-- ==========================================
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modules' AND CONSTRAINT_NAME = 'modules_stage_id_fkey');
SET @sql = IF(@fk_exists = 0, 'ALTER TABLE modules ADD CONSTRAINT modules_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 5. CREATE INDEX FOR stage_id (if not exists)
-- ==========================================
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'modules' AND INDEX_NAME = 'idx_modules_stage_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_modules_stage_id ON modules(stage_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
