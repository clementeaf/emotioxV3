-- Migration: Make created_by nullable in module_templates table
-- This allows creating module templates without authentication until auth is implemented

ALTER TABLE module_templates 
ALTER COLUMN created_by DROP NOT NULL;

-- Add comment to document this is temporary
COMMENT ON COLUMN module_templates.created_by IS 'User ID who created the template. Nullable until authentication is implemented.';
