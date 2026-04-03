-- EmotioxV3 Database Migration - Fix IAT stage_templates_module_templates display_order (MySQL)
-- Version: 019
-- Description:
--   Corrects display_order values in stage_templates_module_templates for IAT module templates.
--   Only Attribute Testing (display_order=0) should be auto-created when adding the Implicit
--   Association stage. Comparing Attribute (1) and Objects Comparing (2) are available via
--   the template drawer only.
--
--   Also ensures Objects Comparing is linked to the Implicit Association stage template.

-- ==========================================
-- Set correct display_order for existing IAT associations
-- ==========================================

-- Attribute Testing → display_order = 0 (auto-created default)
UPDATE stage_templates_module_templates stmt
JOIN module_templates mt ON stmt.module_template_id = mt.id
JOIN stage_templates st ON stmt.stage_template_id = st.id
SET stmt.display_order = 0
WHERE mt.name = 'Attribute Testing' AND mt.is_active = 1
  AND st.name = 'Implicit Association' AND st.is_active = 1;

-- Comparing Attribute → display_order = 1 (template drawer only)
UPDATE stage_templates_module_templates stmt
JOIN module_templates mt ON stmt.module_template_id = mt.id
JOIN stage_templates st ON stmt.stage_template_id = st.id
SET stmt.display_order = 1
WHERE mt.name = 'Comparing Attribute' AND mt.is_active = 1
  AND st.name = 'Implicit Association' AND st.is_active = 1;

-- Objects Comparing → display_order = 2 (template drawer only)
-- Insert if missing, update if exists
INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
SELECT st.id, mt.id, 2
FROM stage_templates st
JOIN module_templates mt ON mt.name = 'Objects Comparing' AND mt.is_active = 1
WHERE st.name = 'Implicit Association' AND st.is_active = 1
ON DUPLICATE KEY UPDATE display_order = 2;
