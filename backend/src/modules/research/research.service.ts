import pool from '../../config/database';
import cache, { CacheKeys } from '../../config/cache';

export interface ResearchData {
    name: string;
    description?: string;
    research_type_id?: string;
    research_technique_id?: string;
    enterprise_id?: string;
    settings?: Record<string, unknown>;
    use_default_modules?: string[]; // Module names to clone from template
}

export const list = async (userId: string) => {
    const query = `
    SELECT r.id, r.name, r.description, r.status, r.research_type_id, r.settings, r.created_at, r.updated_at,
           rt.name as research_type_name
    FROM researches r
    LEFT JOIN research_types rt ON r.research_type_id = rt.id
    WHERE r.user_id = $1 AND r.deleted_at IS NULL
    ORDER BY r.created_at DESC
  `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

export const create = async (userId: string, data: ResearchData) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let { description } = data;
        const { name, research_type_id, research_technique_id, enterprise_id, settings = {}, use_default_modules = [] } = data;

        // If description is not provided and we have a technique, try to get it from the technique
        if (!description && research_technique_id) {
            const techniqueQuery = 'SELECT description FROM research_techniques WHERE id = $1';
            const techniqueResult = await client.query(techniqueQuery, [research_technique_id]);
            if (techniqueResult.rows.length > 0) {
                description = techniqueResult.rows[0].description;
            }
        }

        // Create research
        const researchQuery = `
      INSERT INTO researches (user_id, name, description, research_type_id, research_technique_id, enterprise_id, settings, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
      RETURNING id, name, description, status, research_type_id, research_technique_id, enterprise_id, settings, created_at
    `;
        const researchResult = await client.query(researchQuery, [
            userId,
            name,
            description,
            research_type_id || null,
            research_technique_id || null,
            enterprise_id || null,
            JSON.stringify(settings),
        ]);

        const research = researchResult.rows[0];

        // Clone modules from template if requested
        if (research_type_id && use_default_modules.length > 0) {
            await cloneTemplateModulesInternal(client, research.id, research_type_id, use_default_modules);
        }

        await client.query('COMMIT');
        return research;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const cloneTemplateModulesInternal = async (client: any, researchId: string, researchTypeId: string, moduleNames: string[]) => {
    // Get research type with default_modules
    const typeQuery = 'SELECT default_modules FROM research_types WHERE id = $1';
    const typeResult = await client.query(typeQuery, [researchTypeId]);

    if (typeResult.rows.length === 0) {
        throw new Error('Research type not found');
    }

    const defaultModules = typeResult.rows[0].default_modules || [];

    // Filter modules by names
    const modulesToClone = defaultModules.filter((m: any) => moduleNames.includes(m.name));

    // Create modules and questions
    for (const templateModule of modulesToClone) {
        const moduleQuery = `
      INSERT INTO modules (research_id, name, description, order_index, is_from_template, config)
      VALUES ($1, $2, $3, $4, true, $5)
      RETURNING id
    `;
        const moduleResult = await client.query(moduleQuery, [
            researchId,
            templateModule.name,
            templateModule.description,
            templateModule.order,
            JSON.stringify(templateModule.config || {}),
        ]);

        const moduleId = moduleResult.rows[0].id;

        // Create questions for this module
        if (templateModule.questions && Array.isArray(templateModule.questions)) {
            for (let i = 0; i < templateModule.questions.length; i++) {
                const q = templateModule.questions[i];
                const questionQuery = `
          INSERT INTO questions (module_id, question_type, question_text, order_index, config, validation, required)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
                await client.query(questionQuery, [
                    moduleId,
                    q.type,
                    q.text,
                    i + 1,
                    JSON.stringify(q.config || {}),
                    JSON.stringify(q.validation || {}),
                    q.required || false,
                ]);
            }
        }
    }
};

export const getById = async (researchId: string, userId: string) => {
    const query = `
    SELECT r.id, r.name, r.description, r.status, r.research_type_id, r.research_technique_id, r.settings, r.created_at, r.updated_at,
           rt.name as research_type_name,
           rtech.name as research_technique_name
    FROM researches r
    LEFT JOIN research_types rt ON r.research_type_id = rt.id
    LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
    WHERE r.id = $1 AND r.user_id = $2 AND r.deleted_at IS NULL
  `;
    const result = await pool.query(query, [researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    const research = result.rows[0];

    // Get stages with modules and questions
    const stagesQuery = `
    SELECT s.id, s.name, s.description, s.order_index, s.stage_type,
           COALESCE(json_agg(
             json_build_object(
               'id', m.id,
               'name', m.name,
               'description', m.description,
               'order_index', m.order_index,
               'is_from_template', m.is_from_template,
               'config', m.config,
               'questions', (
                 SELECT COALESCE(json_agg(
                   json_build_object(
                     'id', q.id,
                     'type', q.question_type,
                     'text', q.question_text,
                     'order', q.order_index,
                     'config', q.config,
                     'validation', q.validation,
                     'required', q.required
                   ) ORDER BY q.order_index
                 ), '[]'::json)
                 FROM questions q WHERE q.module_id = m.id
               )
             ) ORDER BY m.order_index
           ) FILTER (WHERE m.id IS NOT NULL), '[]'::json) as modules
    FROM stages s
    LEFT JOIN modules m ON s.id = m.stage_id
    WHERE s.research_id = $1
    GROUP BY s.id
    ORDER BY s.order_index
  `;
    const stagesResult = await pool.query(stagesQuery, [researchId]);

    // Parsear el config de cada módulo para asegurar que sea un objeto
    research.stages = stagesResult.rows.map((row: any) => ({
        ...row,
        modules: (row.modules || []).map((module: any) => {
            // Asegurar que config sea un objeto parseado
            let config = module.config;
            if (typeof config === 'string') {
                try {
                    config = JSON.parse(config);
                } catch (e) {
                    console.error('Error parsing module config:', e);
                    config = {};
                }
            }
            return {
                ...module,
                config: config || {}
            };
        })
    }));

    return research;
};

export const update = async (researchId: string, userId: string, data: Partial<ResearchData>) => {
    const { name, description, settings } = data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
    }
    if (settings !== undefined) {
        updates.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(researchId, userId);

    const query = `
    UPDATE researches
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} AND deleted_at IS NULL
    RETURNING id, name, description, status, settings, updated_at
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    return result.rows[0];
};

export const updateStatus = async (researchId: string, userId: string, status: string) => {
    const query = `
    UPDATE researches
    SET status = $1
    WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
    RETURNING id, name, status, updated_at
  `;
    const result = await pool.query(query, [status, researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    return result.rows[0];
};

/**
 * Activa una investigación cambiando su estado a 'active'
 * @param researchId - ID de la investigación
 * @param userId - ID del usuario propietario
 * @returns Investigación actualizada
 */
export const activate = async (researchId: string, userId: string) => {
    const query = `
    UPDATE researches
    SET status = 'active', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    RETURNING id, name, status, updated_at
  `;
    const result = await pool.query(query, [researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }
    
    // Invalidate public cache for this research
    cache.delete(`${CacheKeys.PUBLIC_RESEARCH}:${researchId}`);

    return result.rows[0];
};

export const deleteResearch = async (researchId: string, userId: string) => {
    const query = `
    UPDATE researches
    SET deleted_at = CURRENT_TIMESTAMP, status = 'deleted'
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
    RETURNING id
  `;
    const result = await pool.query(query, [researchId, userId]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }
    
    // Invalidate public cache for this research
    cache.delete(`${CacheKeys.PUBLIC_RESEARCH}:${researchId}`);

    return { message: 'Research deleted successfully' };
};

/**
 * Crea un nuevo stage en un research
 * @param researchId - ID del research
 * @param userId - ID del usuario
 * @param stageName - Nombre del stage
 * @param description - Descripción opcional del stage
 * @returns Stage creado
 */
export const createStage = async (researchId: string, userId: string, stageName: string, description?: string) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario
        const researchCheck = await client.query(
            'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [researchId, userId]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Obtener el máximo order_index para este research
        const maxOrderResult = await client.query(
            'SELECT COALESCE(MAX(order_index), 0) as max_order FROM stages WHERE research_id = $1',
            [researchId]
        );
        const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

        // Buscar el stage_template para obtener el stage_type y módulos asociados
        const templateResult = await client.query(
            'SELECT id, stage_type FROM stage_templates WHERE name = $1 AND is_active = true',
            [stageName]
        );
        
        let stageType: 'single_module' | 'module_collection' = 'module_collection';
        let stageTemplateId: string | null = null;
        let modulesToClone: Array<{ id: string; name: string; description: string; structure: Record<string, unknown>; display_order: number }> = [];

        if (templateResult.rows.length > 0) {
            stageTemplateId = templateResult.rows[0].id;
            stageType = templateResult.rows[0].stage_type || 'module_collection';

            // Obtener módulos asociados al stage template
            const modulesResult = await client.query(
                `SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
                 FROM stage_templates_module_templates stmt
                 JOIN module_templates mt ON stmt.module_template_id = mt.id
                 WHERE stmt.stage_template_id = $1 AND mt.is_active = true
                 ORDER BY stmt.display_order`,
                [stageTemplateId]
            );
            modulesToClone = modulesResult.rows;
        }

        // Crear el stage con el stage_type del template
        const stageQuery = `
            INSERT INTO stages (research_id, name, description, order_index, stage_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, description, order_index, stage_type, created_at, updated_at
        `;
        const stageResult = await client.query(stageQuery, [
            researchId, 
            stageName, 
            description || null, 
            nextOrder,
            stageType
        ]);
        const newStage = stageResult.rows[0];

        // Si hay módulos asociados, clonarlos
        if (modulesToClone.length > 0) {
            for (const templateModule of modulesToClone) {
                // Parse structure si es string, o usar directamente si es objeto
                let structure = templateModule.structure;
                
                // Si es string, parsearlo
                if (typeof structure === 'string') {
                    try {
                        structure = JSON.parse(structure);
                    } catch (e) {
                        console.error(`Error parsing structure for module "${templateModule.name}":`, e);
                        structure = {};
                    }
                }
                
                // Si no es un objeto válido, usar objeto vacío
                if (!structure || typeof structure !== 'object' || Array.isArray(structure)) {
                    structure = {};
                }
                
                // El config debe tener la estructura { structure: { components: [...] } }
                // para que el frontend lo encuentre correctamente
                const config = {
                    structure: structure
                };
                
                const moduleQuery = `
                    INSERT INTO modules (research_id, stage_id, name, description, order_index, is_from_template, config)
                    VALUES ($1, $2, $3, $4, $5, true, $6)
                    RETURNING id
                `;
                await client.query(moduleQuery, [
                    researchId,
                    newStage.id,
                    templateModule.name,
                    templateModule.description,
                    templateModule.display_order,
                    JSON.stringify(config),
                ]);
                
                console.log(`✓ Created module "${templateModule.name}" for stage "${stageName}"`);
            }
        } else {
            console.log(`⚠️  No modules found for stage template "${stageName}"`);
        }

        await client.query('COMMIT');
        return newStage;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Elimina un stage de un research
 * @param researchId - ID del research
 * @param userId - ID del usuario
 * @param stageId - ID del stage a eliminar
 * @returns Mensaje de confirmación
 */
export const deleteStage = async (researchId: string, userId: string, stageId: string) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario
        const researchCheck = await client.query(
            'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [researchId, userId]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Verificar que el stage existe y pertenece al research
        const stageCheck = await client.query(
            'SELECT id FROM stages WHERE id = $1 AND research_id = $2',
            [stageId, researchId]
        );

        if (stageCheck.rows.length === 0) {
            throw new Error('Stage not found');
        }

        // Eliminar el stage (CASCADE eliminará automáticamente los módulos asociados)
        await client.query('DELETE FROM stages WHERE id = $1', [stageId]);

        await client.query('COMMIT');
        return { message: 'Stage deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Elimina un módulo de un research
 * @param researchId - ID del research
 * @param userId - ID del usuario
 * @param moduleId - ID del módulo a eliminar
 * @returns Mensaje de confirmación
 */
export const deleteModule = async (researchId: string, userId: string, moduleId: string) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario
        const researchCheck = await client.query(
            'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [researchId, userId]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Verificar que el módulo existe y pertenece al research
        const moduleCheck = await client.query(
            'SELECT id FROM modules WHERE id = $1 AND research_id = $2',
            [moduleId, researchId]
        );

        if (moduleCheck.rows.length === 0) {
            throw new Error('Module not found');
        }

        // Eliminar el módulo (CASCADE eliminará automáticamente las questions asociadas)
        await client.query('DELETE FROM modules WHERE id = $1', [moduleId]);

        await client.query('COMMIT');
        return { message: 'Module deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
