-- Consulta SQL para revisar el módulo Ranking de la investigación "Probando"
-- Ejecutar en MySQL (cPanel phpMyAdmin o terminal MySQL)

-- 1. Buscar la investigación "Probando"
SELECT id, name, description, status
FROM researches
WHERE name = 'Probando' AND deleted_at IS NULL
LIMIT 1;

-- 2. Buscar el módulo Ranking (reemplaza RESEARCH_ID con el ID de arriba)
SELECT 
    m.id,
    m.name,
    m.description,
    m.order_index,
    m.config,
    s.name as stage_name
FROM modules m
INNER JOIN stages s ON m.stage_id = s.id
WHERE s.research_id = (SELECT id FROM researches WHERE name = 'Probando' LIMIT 1) 
  AND m.name = 'Ranking'
ORDER BY m.order_index;

-- 3. Ver config formateado del módulo Ranking
SELECT 
    m.id,
    m.name,
    JSON_PRETTY(m.config) as config_formatted
FROM modules m
INNER JOIN stages s ON m.stage_id = s.id
WHERE s.research_id = (SELECT id FROM researches WHERE name = 'Probando' LIMIT 1) 
  AND m.name = 'Ranking'
LIMIT 1;
