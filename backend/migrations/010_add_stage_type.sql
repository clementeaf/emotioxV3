-- Add stage_type column to stage_templates table
-- This field explicitly indicates if a stage is a single module or a collection of modules
ALTER TABLE stage_templates 
ADD COLUMN IF NOT EXISTS stage_type VARCHAR(20) DEFAULT 'module_collection' 
CHECK (stage_type IN ('single_module', 'module_collection'));

-- Add comment
COMMENT ON COLUMN stage_templates.stage_type IS 'Type of stage: single_module (e.g., Welcome Screen) or module_collection (e.g., Smart VOC)';

-- Update existing records based on module count
-- If a stage has exactly 1 module, set to single_module
-- Otherwise, set to module_collection
UPDATE stage_templates st
SET stage_type = CASE 
    WHEN (
        SELECT COUNT(*) 
        FROM stage_templates_module_templates stmt 
        WHERE stmt.stage_template_id = st.id
    ) = 1 THEN 'single_module'
    ELSE 'module_collection'
END;

-- Add stage_type to stages table as well (for runtime stages in researches)
ALTER TABLE stages 
ADD COLUMN IF NOT EXISTS stage_type VARCHAR(20) DEFAULT 'module_collection'
CHECK (stage_type IN ('single_module', 'module_collection'));

COMMENT ON COLUMN stages.stage_type IS 'Type of stage: single_module (e.g., Welcome Screen) or module_collection (e.g., Smart VOC)';

