-- EEG module template
INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
VALUES (
  UUID(),
  'EEG Recording',
  'Brain activity measurement via EEG headband (Muse, Emotiv, OpenBCI)',
  '{"components":[{"id":"task-instructions","type":"input","label":"Task instructions","placeholder":{"enabled":true,"text":"Relax and observe the following stimuli"},"required":false,"order":1},{"id":"stimuli","type":"file-upload","label":"Stimuli","order":2,"fileUpload":{"maxSizeMB":10,"acceptedFormats":["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm"],"multiple":true}},{"id":"recording-duration","type":"select","label":"Recording duration per stimulus","value":"30","options":[{"label":"10 sec","value":"10"},{"label":"15 sec","value":"15"},{"label":"20 sec","value":"20"},{"label":"30 sec","value":"30"},{"label":"60 sec","value":"60"},{"label":"120 sec","value":"120"}],"order":3},{"id":"baseline-duration","type":"select","label":"Baseline recording (eyes closed)","value":"30","options":[{"label":"None","value":"0"},{"label":"15 sec","value":"15"},{"label":"30 sec","value":"30"},{"label":"60 sec","value":"60"}],"order":4},{"id":"device-type","type":"select","label":"EEG Device","value":"any","options":[{"label":"Any compatible","value":"any"},{"label":"Muse 2 / Muse S","value":"muse"},{"label":"Emotiv Insight / EPOC","value":"emotiv"},{"label":"OpenBCI","value":"openbci"}],"order":5}]}',
  1, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE structure = VALUES(structure), description = VALUES(description), updated_at = NOW();

INSERT INTO stage_templates (id, name, stage_type, description, is_active, created_at, updated_at)
VALUES (UUID(), 'EEG Recording', 'single_module', 'Brain activity measurement via EEG', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), updated_at = NOW();

INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
SELECT st.id, mt.id, 0 FROM stage_templates st, module_templates mt
WHERE st.name = 'EEG Recording' AND mt.name = 'EEG Recording'
ON DUPLICATE KEY UPDATE display_order = 0;

-- Wearables (Heart Rate / HRV / GSR) module template
INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
VALUES (
  UUID(),
  'Biometric Wearable',
  'Heart rate, HRV, and stress measurement via BLE wearable',
  '{"components":[{"id":"task-instructions","type":"input","label":"Task instructions","placeholder":{"enabled":true,"text":"Wear the sensor and observe the stimuli"},"required":false,"order":1},{"id":"stimuli","type":"file-upload","label":"Stimuli","order":2,"fileUpload":{"maxSizeMB":10,"acceptedFormats":["image/jpeg","image/png","image/gif","image/webp","video/mp4","video/webm"],"multiple":true}},{"id":"recording-duration","type":"select","label":"Recording duration per stimulus","value":"30","options":[{"label":"10 sec","value":"10"},{"label":"15 sec","value":"15"},{"label":"20 sec","value":"20"},{"label":"30 sec","value":"30"},{"label":"60 sec","value":"60"},{"label":"120 sec","value":"120"}],"order":3},{"id":"baseline-duration","type":"select","label":"Baseline recording (resting)","value":"30","options":[{"label":"None","value":"0"},{"label":"15 sec","value":"15"},{"label":"30 sec","value":"30"},{"label":"60 sec","value":"60"}],"order":4},{"id":"metrics","type":"select","label":"Metrics to capture","value":"hr-hrv","options":[{"label":"Heart Rate only","value":"hr"},{"label":"Heart Rate + HRV","value":"hr-hrv"},{"label":"Heart Rate + HRV + GSR","value":"hr-hrv-gsr"}],"order":5}]}',
  1, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE structure = VALUES(structure), description = VALUES(description), updated_at = NOW();

INSERT INTO stage_templates (id, name, stage_type, description, is_active, created_at, updated_at)
VALUES (UUID(), 'Biometric Wearable', 'single_module', 'Heart rate and stress via wearable', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), updated_at = NOW();

INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
SELECT st.id, mt.id, 0 FROM stage_templates st, module_templates mt
WHERE st.name = 'Biometric Wearable' AND mt.name = 'Biometric Wearable'
ON DUPLICATE KEY UPDATE display_order = 0;
