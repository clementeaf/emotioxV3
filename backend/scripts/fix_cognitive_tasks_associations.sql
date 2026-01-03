-- Script SQL para asociar los módulos de Cognitive Tasks al stage template correspondiente
-- Este script puede ejecutarse directamente en la base de datos de producción

BEGIN;

-- 1. Obtener o crear el stage template "Cognitive Tasks"
DO $$
DECLARE
    cognitive_tasks_stage_id UUID;
BEGIN
    -- Buscar el stage template "Cognitive Tasks"
    SELECT id INTO cognitive_tasks_stage_id
    FROM stage_templates
    WHERE name = 'Cognitive Tasks' AND is_active = true;

    -- Si no existe, crearlo
    IF cognitive_tasks_stage_id IS NULL THEN
        INSERT INTO stage_templates (name, description, stage_type, is_active, created_at, updated_at)
        VALUES (
            'Cognitive Tasks',
            'Cognitive assessment and task-based research modules.',
            'module_collection',
            true,
            NOW(),
            NOW()
        )
        RETURNING id INTO cognitive_tasks_stage_id;
        
        RAISE NOTICE 'Created "Cognitive Tasks" stage template with ID: %', cognitive_tasks_stage_id;
    ELSE
        RAISE NOTICE 'Found "Cognitive Tasks" stage template with ID: %', cognitive_tasks_stage_id;
    END IF;

    -- 2. Asociar los 8 módulos de Cognitive Tasks al stage template
    -- Los módulos se buscan por nombre exacto o con variaciones
    
    -- Short Text
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        0
    FROM module_templates
    WHERE name = 'Short Text' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 0;

    -- Long Text
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        1
    FROM module_templates
    WHERE name = 'Long Text' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 1;

    -- Single Choice
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        2
    FROM module_templates
    WHERE name = 'Single Choice' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 2;

    -- Multiple Choice
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        3
    FROM module_templates
    WHERE name = 'Multiple Choice' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 3;

    -- Linear Scale
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        4
    FROM module_templates
    WHERE name = 'Linear Scale' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 4;

    -- Ranking
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        5
    FROM module_templates
    WHERE name = 'Ranking' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 5;

    -- Navigation Flow
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        6
    FROM module_templates
    WHERE name = 'Navigation Flow' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 6;

    -- Preference Test
    INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
    SELECT 
        cognitive_tasks_stage_id,
        id,
        7
    FROM module_templates
    WHERE name = 'Preference Test' AND is_active = true
    ON CONFLICT (stage_template_id, module_template_id) 
    DO UPDATE SET display_order = 7;

    -- 3. Eliminar asociaciones de estos módulos con otros stages (excepto Cognitive Tasks)
    DELETE FROM stage_templates_module_templates
    WHERE module_template_id IN (
        SELECT id FROM module_templates
        WHERE name IN (
            'Short Text',
            'Long Text',
            'Single Choice',
            'Multiple Choice',
            'Linear Scale',
            'Ranking',
            'Navigation Flow',
            'Preference Test'
        )
        AND is_active = true
    )
    AND stage_template_id != cognitive_tasks_stage_id;

    RAISE NOTICE 'Successfully associated Cognitive Tasks modules to stage template';
END $$;

-- Verificar las asociaciones creadas
SELECT 
    st.name as stage_name,
    mt.name as module_name,
    stmt.display_order
FROM stage_templates_module_templates stmt
JOIN stage_templates st ON stmt.stage_template_id = st.id
JOIN module_templates mt ON stmt.module_template_id = mt.id
WHERE st.name = 'Cognitive Tasks'
ORDER BY stmt.display_order;

COMMIT;

