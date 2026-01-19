-- Migration: Update responses table for participant responses (MySQL)
-- This migration adds component_id and updated_at columns to support
-- the new participant response system from participant-frontend

-- Add component_id column (nullable to maintain backward compatibility)
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS component_id VARCHAR(255);

-- Add updated_at column for tracking response updates
ALTER TABLE responses
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Make question_id nullable (new system uses component_id instead)
ALTER TABLE responses
MODIFY COLUMN question_id CHAR(36) NULL;

-- Add index for component_id lookups
CREATE INDEX IF NOT EXISTS idx_responses_component_id ON responses(component_id);

-- Add index for updated_at
CREATE INDEX IF NOT EXISTS idx_responses_updated_at ON responses(updated_at DESC);

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
