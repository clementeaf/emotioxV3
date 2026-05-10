-- Emotion Analysis module template: standalone facial coding without eye tracking.
-- Records 7 Ekman emotions, 9 FACS Action Units, and micro-expressions via webcam
-- while participant views stimuli (images or video).
--
-- Components:
--   task-instructions  (input)       — instruction text
--   stimuli            (file-upload) — stimulus images/video
--   viewing-time       (select)      — display duration
--   randomize-stimuli  (checkbox)    — randomize order

-- 1. Upsert module template
INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
VALUES (
  UUID(),
  'Emotion Analysis',
  'Facial emotion recognition with FACS Action Units and micro-expression detection',
  '{"components":[{"id":"task-instructions","type":"input","label":"Task instructions","placeholder":{"enabled":true,"text":"Observe the following images/videos carefully"},"required":false,"order":1},{"id":"stimuli","type":"file-upload","label":"Stimuli","order":2,"fileUpload":{"maxSizeMB":10,"acceptedFormats":["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm"],"multiple":true}},{"id":"viewing-time","type":"select","label":"Viewing time per stimulus","value":"10","options":[{"label":"5 sec","value":"5"},{"label":"10 sec","value":"10"},{"label":"15 sec","value":"15"},{"label":"20 sec","value":"20"},{"label":"30 sec","value":"30"},{"label":"60 sec","value":"60"}],"order":3},{"id":"randomize-stimuli","type":"checkbox","label":"Randomize stimulus order","value":"false","order":4}]}',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  structure = VALUES(structure),
  description = VALUES(description),
  updated_at = NOW();

-- 2. Create stage template for Emotion Analysis
INSERT INTO stage_templates (id, name, type, description, is_active, created_at, updated_at)
VALUES (
  UUID(),
  'Emotion Analysis',
  'single_module',
  'Webcam-based facial emotion recognition',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  updated_at = NOW();

-- 3. Link module template to stage template
INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
SELECT st.id, mt.id, 0
FROM stage_templates st, module_templates mt
WHERE st.name = 'Emotion Analysis' AND mt.name = 'Emotion Analysis'
ON DUPLICATE KEY UPDATE display_order = 0;
