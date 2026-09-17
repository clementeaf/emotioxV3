UPDATE module_templates
SET structure = JSON_ARRAY_INSERT(
  structure,
  '$.components[0]',
  JSON_OBJECT(
    'id', 'reference-image',
    'name', 'Reference Image',
    'type', 'file-upload',
    'label', 'Reference Image',
    'required', false,
    'order', 0,
    'settings', JSON_OBJECT(
      'accept', 'image/*',
      'maxFiles', 1,
      'phoneFrame', false
    )
  )
)
WHERE name IN ('Ranking', 'Short Text', 'Long Text', 'Single Choice', 'Multiple Choice', 'Linear Scale')
  AND is_active = 1;
