-- Fix stage_type for Welcome Screen and Thank You Screen stages
-- These should be single_module, not module_collection

-- Update stage templates
UPDATE stage_templates 
SET stage_type = 'single_module' 
WHERE name IN ('Welcome Screen', 'Thank You Screen') 
AND stage_type = 'module_collection';

-- Update existing stages in researches
UPDATE stages 
SET stage_type = 'single_module' 
WHERE name IN ('Welcome Screen', 'Thank You Screen') 
AND stage_type = 'module_collection';

-- Verify the changes
SELECT name, stage_type FROM stage_templates WHERE name IN ('Welcome Screen', 'Thank You Screen');

