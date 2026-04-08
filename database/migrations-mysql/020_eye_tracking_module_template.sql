-- Eye Tracking module template: defines canonical component IDs shared by
-- research-frontend builder, participant-frontend renderer, and backend analytics.
--
-- Components:
--   task-instructions  (input)       — instruction text for the participant
--   stimuli            (file-upload) — stimulus images/video
--   emotion-recognition (checkbox)   — enable emotion recognition
--   attention-measurement (checkbox) — enable attention measurement
--   priming-time       (select)      — stimulus display duration in seconds
--   display-mode       (select)      — stand_alone or shelf
--   randomize-stimuli  (checkbox)    — randomize image order (shelf mode)
--   shelf-count        (select)      — number of shelves
--   shelf-items        (select)      — items per shelf
--   aois               (hidden/json) — researcher-defined areas of interest

-- 1. Upsert module template
INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
VALUES (
  UUID(),
  'Eye Tracking',
  'Eye tracking with emotion recognition and attention measurement',
  '{"components":[{"id":"task-instructions","type":"input","label":"Task instructions","placeholder":{"enabled":true,"text":"Describe the task for the participant"},"required":false,"order":1},{"id":"stimuli","type":"file-upload","label":"Stimuli","order":2,"fileUpload":{"maxSizeMB":10,"acceptedFormats":["image/jpeg","image/png","image/gif","image/webp","video/mp4"],"multiple":true}},{"id":"emotion-recognition","type":"checkbox","label":"Emotion recognition","value":"true","order":3},{"id":"attention-measurement","type":"checkbox","label":"Attention measurement","value":"true","order":4},{"id":"priming-time","type":"select","label":"Priming display time","value":"10","options":[{"label":"5 sec","value":"5"},{"label":"10 sec","value":"10"},{"label":"15 sec","value":"15"},{"label":"20 sec","value":"20"},{"label":"30 sec","value":"30"}],"order":5},{"id":"display-mode","type":"select","label":"Display mode","value":"stand_alone","options":[{"label":"Stand Alone","value":"stand_alone"},{"label":"Shelf","value":"shelf"}],"order":6,"hidden":true},{"id":"randomize-stimuli","type":"checkbox","label":"Randomize options (images)","value":"false","order":7},{"id":"shelf-count","type":"select","label":"Number of Shelfs","value":"2","options":[{"label":"1","value":"1"},{"label":"2","value":"2"},{"label":"3","value":"3"},{"label":"4","value":"4"},{"label":"5","value":"5"}],"order":8},{"id":"shelf-items","type":"select","label":"Items per Shelf","value":"5","options":[{"label":"3","value":"3"},{"label":"4","value":"4"},{"label":"5","value":"5"},{"label":"6","value":"6"},{"label":"7","value":"7"},{"label":"8","value":"8"},{"label":"10","value":"10"}],"order":9},{"id":"aois","type":"hidden","label":"Areas of Interest","value":"[]","order":10}]}',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  structure = VALUES(structure),
  description = VALUES(description),
  updated_at = NOW();

-- 2. Link module template to Eye Tracking stage template
INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
SELECT st.id, mt.id, 0
FROM stage_templates st, module_templates mt
WHERE st.name = 'Eye Tracking' AND mt.name = 'Eye Tracking'
ON DUPLICATE KEY UPDATE display_order = 0;
