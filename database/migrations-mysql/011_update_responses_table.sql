-- Migration: Update responses table for participant responses (MySQL)
-- This migration adds component_id and updated_at columns to support
-- the new participant response system from participant-frontend

-- Add component_id column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'responses' AND COLUMN_NAME = 'component_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE responses ADD COLUMN component_id VARCHAR(255)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add updated_at column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'responses' AND COLUMN_NAME = 'updated_at');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE responses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make question_id nullable (new system uses component_id instead)
ALTER TABLE responses
MODIFY COLUMN question_id CHAR(36) NULL;

-- Add index for component_id lookups if it doesn't exist
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'responses' AND INDEX_NAME = 'idx_responses_component_id');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_responses_component_id ON responses(component_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for updated_at if it doesn't exist
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'responses' AND INDEX_NAME = 'idx_responses_updated_at');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_responses_updated_at ON responses(updated_at DESC)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rename old 'answer' column to 'value' for consistency
-- Check if column exists and rename
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE()
    AND table_name = 'responses'
    AND column_name = 'answer');

SET @sql = IF(@col_exists > 0,
    'ALTER TABLE responses CHANGE COLUMN answer value JSON NOT NULL',
    'SELECT "Column answer does not exist, skipping rename" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
