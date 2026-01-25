-- Update CSAT module template to change "Stars (⭐⭐⭐⭐⭐)" to "Stars"
-- This removes the emoji stars from the display option label

UPDATE module_templates
SET structure = JSON_SET(
    structure,
    '$.components[3].options[0].label',
    'Stars'
)
WHERE name = 'Customer Satisfaction Score (CSAT)'
  AND JSON_EXTRACT(structure, '$.components[3].id') = 'csat-display-type'
  AND JSON_EXTRACT(structure, '$.components[3].options[0].label') LIKE '%⭐%';

-- Verify the update
SELECT 
    id,
    name,
    JSON_EXTRACT(structure, '$.components[3].options[0].label') as stars_label,
    JSON_EXTRACT(structure, '$.components[3].options[1].label') as numbers_label
FROM module_templates
WHERE name = 'Customer Satisfaction Score (CSAT)';
