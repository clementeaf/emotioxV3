-- ============================================================
-- Script: Copiar researches de Clemente a Alexis
-- Fecha: 2026-03-17
-- Descripción: Duplica 5 researches completos (structure + data)
-- Ejecutar en producción vía SSH
-- ============================================================

SET @clemente_id = '436fae3d-f4cd-11f0-89bb-0200fd8285c9';
SET @alexis_id   = '39f7e204-f612-11f0-89bb-0200fd8285c9';

-- Verificación previa
SELECT 'ANTES - Researches de Alexis:' AS info;
SELECT COUNT(*) AS count FROM researches WHERE created_by = @alexis_id AND deleted_at IS NULL;

SELECT 'Researches de Clemente a copiar:' AS info;
SELECT id, name, status FROM researches WHERE created_by = @clemente_id AND deleted_at IS NULL;

-- ============================================================
-- INICIO TRANSACCIÓN
-- ============================================================
START TRANSACTION;

-- ============================================================
-- 1. Tablas temporales de mapeo old_id → new_id
-- ============================================================
DROP TEMPORARY TABLE IF EXISTS _map_research;
DROP TEMPORARY TABLE IF EXISTS _map_stage;
DROP TEMPORARY TABLE IF EXISTS _map_module;
DROP TEMPORARY TABLE IF EXISTS _map_question;

CREATE TEMPORARY TABLE _map_research (
  old_id CHAR(36) PRIMARY KEY,
  new_id CHAR(36) NOT NULL
);

CREATE TEMPORARY TABLE _map_stage (
  old_id CHAR(36) PRIMARY KEY,
  new_id CHAR(36) NOT NULL
);

CREATE TEMPORARY TABLE _map_module (
  old_id CHAR(36) PRIMARY KEY,
  new_id CHAR(36) NOT NULL
);

CREATE TEMPORARY TABLE _map_question (
  old_id CHAR(36) PRIMARY KEY,
  new_id CHAR(36) NOT NULL
);

-- ============================================================
-- 2. RESEARCHES — copiar con nuevo UUID y created_by = Alexis
-- ============================================================
INSERT INTO _map_research (old_id, new_id)
SELECT id, UUID() FROM researches
WHERE created_by = @clemente_id AND deleted_at IS NULL;

INSERT INTO researches (id, name, description, research_type_id, research_technique_id, enterprise_id, status, config, demographics, quotas, created_by, started_at, completed_at, created_at, updated_at, deleted_at)
SELECT
  mr.new_id,
  r.name,
  r.description,
  r.research_type_id,
  r.research_technique_id,
  r.enterprise_id,
  r.status,
  r.config,
  r.demographics,
  r.quotas,
  @alexis_id,
  r.started_at,
  r.completed_at,
  NOW(),
  NOW(),
  NULL
FROM researches r
JOIN _map_research mr ON mr.old_id = r.id;

SELECT 'Researches copiados:' AS step, COUNT(*) AS count FROM _map_research;

-- ============================================================
-- 3. STAGES — copiar con nuevo UUID y nuevo research_id
-- ============================================================
INSERT INTO _map_stage (old_id, new_id)
SELECT s.id, UUID() FROM stages s
JOIN _map_research mr ON mr.old_id = s.research_id;

INSERT INTO stages (id, research_id, stage_template_id, name, description, display_order, config, stage_type, created_at, updated_at)
SELECT
  ms.new_id,
  mr.new_id,
  s.stage_template_id,
  s.name,
  s.description,
  s.display_order,
  s.config,
  s.stage_type,
  NOW(),
  NOW()
FROM stages s
JOIN _map_stage ms ON ms.old_id = s.id
JOIN _map_research mr ON mr.old_id = s.research_id;

SELECT 'Stages copiados:' AS step, COUNT(*) AS count FROM _map_stage;

-- ============================================================
-- 4. MODULES — copiar con nuevo UUID, nuevo research_id + stage_id
-- ============================================================
INSERT INTO _map_module (old_id, new_id)
SELECT m.id, UUID() FROM modules m
JOIN _map_research mr ON mr.old_id = m.research_id;

INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config, created_at, updated_at)
SELECT
  mm.new_id,
  mr.new_id,
  ms.new_id,
  m.name,
  m.description,
  m.order_index,
  m.is_from_template,
  m.config,
  NOW(),
  NOW()
FROM modules m
JOIN _map_module mm ON mm.old_id = m.id
JOIN _map_research mr ON mr.old_id = m.research_id
LEFT JOIN _map_stage ms ON ms.old_id = m.stage_id;

SELECT 'Modules copiados:' AS step, COUNT(*) AS count FROM _map_module;

-- ============================================================
-- 5. QUESTIONS — copiar con nuevo UUID, nuevo module_id
-- ============================================================
INSERT INTO _map_question (old_id, new_id)
SELECT q.id, UUID() FROM questions q
JOIN _map_module mm ON mm.old_id = q.module_id;

INSERT INTO questions (id, module_id, question_type, question_text, order_index, config, validation, `required`, created_at, updated_at)
SELECT
  mq.new_id,
  mm.new_id,
  q.question_type,
  q.question_text,
  q.order_index,
  q.config,
  q.validation,
  q.`required`,
  NOW(),
  NOW()
FROM questions q
JOIN _map_question mq ON mq.old_id = q.id
JOIN _map_module mm ON mm.old_id = q.module_id;

SELECT 'Questions copiadas:' AS step, COUNT(*) AS count FROM _map_question;

-- ============================================================
-- 6. MEDIA — copiar con nuevo UUID, nuevo research_id + question_id
--    Los archivos físicos se comparten (mismo s3_key)
-- ============================================================
INSERT INTO media (id, research_id, question_id, s3_key, s3_bucket, file_name, file_type, file_size, metadata, created_at)
SELECT
  UUID(),
  mr.new_id,
  mq.new_id,
  med.s3_key,
  med.s3_bucket,
  med.file_name,
  med.file_type,
  med.file_size,
  med.metadata,
  NOW()
FROM media med
JOIN _map_research mr ON mr.old_id = med.research_id
LEFT JOIN _map_question mq ON mq.old_id = med.question_id;

SELECT 'Media copiados:' AS step, COUNT(*) AS cnt
FROM media med
JOIN _map_research mr ON mr.old_id = med.research_id;

-- ============================================================
-- 7. RESPONSES — copiar con nuevo UUID, nuevo research_id + stage_id
--    module_id se remapea como string, component_id se mantiene igual
-- ============================================================
INSERT INTO responses (id, research_id, stage_id, session_id, participant_id, module_id, question_id, component_id, value, metadata, created_at, updated_at)
SELECT
  UUID(),
  mr.new_id,
  ms.new_id,
  resp.session_id,
  resp.participant_id,
  mm.new_id,
  resp.question_id,
  resp.component_id,
  resp.value,
  resp.metadata,
  resp.created_at,
  NOW()
FROM responses resp
JOIN _map_research mr ON mr.old_id = resp.research_id
LEFT JOIN _map_stage ms ON ms.old_id = resp.stage_id
LEFT JOIN _map_module mm ON mm.old_id = resp.module_id;

SELECT 'Responses copiadas:' AS step, COUNT(*) AS cnt
FROM responses resp
JOIN _map_research mr ON mr.old_id = resp.research_id;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
SELECT 'DESPUÉS - Researches de Alexis:' AS info;
SELECT r.name, r.status,
  (SELECT COUNT(*) FROM stages s WHERE s.research_id = r.id) AS stages,
  (SELECT COUNT(*) FROM modules m WHERE m.research_id = r.id) AS modules,
  (SELECT COUNT(*) FROM responses resp WHERE resp.research_id = r.id) AS responses,
  (SELECT COUNT(*) FROM media med WHERE med.research_id = r.id) AS media
FROM researches r
WHERE r.created_by = @alexis_id AND r.deleted_at IS NULL;

-- COMMIT automático (verificación incluida arriba)
COMMIT;

-- Limpiar temporales
DROP TEMPORARY TABLE IF EXISTS _map_research;
DROP TEMPORARY TABLE IF EXISTS _map_stage;
DROP TEMPORARY TABLE IF EXISTS _map_module;
DROP TEMPORARY TABLE IF EXISTS _map_question;
