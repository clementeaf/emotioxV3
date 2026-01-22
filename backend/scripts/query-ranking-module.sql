-- Consulta SQL para revisar el módulo Ranking de la investigación "Probando"
-- Ejecutar en MySQL (cPanel phpMyAdmin o terminal MySQL)

-- 1. Buscar la investigación "Probando"
SELECT id, name, description, status
FROM researches
WHERE name = 'Probando' AND deleted_at IS NULL
LIMIT 1;

-- 2. Una vez que tengas el research_id, buscar el módulo Ranking
-- Reemplaza 'RESEARCH_ID_AQUI' con el ID de la investigación encontrada arriba
SELECT 
    m.id,
    m.name,
    m.description,
    m.order_index,
    m.config,
    s.name as stage_name
FROM modules m
INNER JOIN stages s ON m.stage_id = s.id
WHERE s.research_id = 'RESEARCH_ID_AQUI' AND m.name = 'Ranking'
ORDER BY m.order_index;

-- 3. Para ver el config en formato legible (si es JSON)
-- Reemplaza 'MODULE_ID_AQUI' con el ID del módulo encontrado arriba
SELECT 
    id,
    name,
    JSON_PRETTY(config) as config_formatted
FROM modules
WHERE id = 'MODULE_ID_AQUI';

-- 4. Ver los componentes dentro del config.structure.components
-- Esto requiere extraer el JSON anidado
SELECT 
    id,
    name,
    JSON_EXTRACT(config, '$.structure.components') as components
FROM modules
WHERE id = 'MODULE_ID_AQUI';

-- 5. Ver cada componente individualmente (si MySQL 8.0+)
SELECT 
    id,
    name,
    JSON_EXTRACT(config, '$.structure.components[*].id') as component_ids,
    JSON_EXTRACT(config, '$.structure.components[*].type') as component_types,
    JSON_EXTRACT(config, '$.structure.components[*].label') as component_labels,
    JSON_EXTRACT(config, '$.structure.components[*].value') as component_values,
    JSON_EXTRACT(config, '$.structure.components[*].options') as component_options
FROM modules
WHERE id = 'MODULE_ID_AQUI';
