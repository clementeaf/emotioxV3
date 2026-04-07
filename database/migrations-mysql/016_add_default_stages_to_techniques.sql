-- EmotioxV3 Database Migration - Add default_stages to research_techniques (MySQL)
-- Version: 016
-- Description: Adds default_stages JSON column to research_techniques table
--              and populates it for the "Biometric, Cognitive and Predictive" technique.

-- ==========================================
-- 1. ADD default_stages COLUMN IF NOT EXISTS
-- ==========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'research_techniques' AND COLUMN_NAME = 'default_stages');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE research_techniques ADD COLUMN default_stages JSON DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ==========================================
-- 2. POPULATE default_stages for "Biometric, Cognitive and Predictive"
-- ==========================================
UPDATE research_techniques
SET default_stages = '[{"name":"Screener","order":1,"is_default":true},{"name":"Welcome Screen","order":2,"is_default":true},{"name":"Research Configuration","order":3,"is_default":true},{"name":"Implicit Association","order":4,"is_default":true},{"name":"Cognitive Tasks","order":5,"is_default":true},{"name":"Eye Tracking","order":6,"is_default":true},{"name":"Thank You Screen","order":7,"is_default":true}]'
WHERE name = 'Biometric, Cognitive and Predictive';
