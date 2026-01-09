import pool from '../../config/database';
import type { PoolClient } from 'pg';
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
    console.log('[Research Service] create() called with data:', JSON.stringify(data, null, 2));
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let { description } = data;
        const { name, research_type_id, research_technique_id, enterprise_id, settings = {}, use_default_modules = [] } = data;
        console.log('[Research Service] Extracted values - research_type_id:', research_type_id, 'use_default_modules:', use_default_modules);

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

        // Automatically add "Research Configuration" stage to all new researches FIRST
        await addDefaultStage(client, research.id, userId);

        // Clone modules from template if requested and associate them to a stage
        if (research_type_id) {
            console.log(`[Research Service] Creating default modules for research type ${research_type_id}`);
            console.log(`[Research Service] use_default_modules:`, use_default_modules);
            
            // If use_default_modules is provided, use it; otherwise, get all default modules from the research type
            let modulesToCreate: string[] = [];
            
            if (use_default_modules && use_default_modules.length > 0) {
                modulesToCreate = use_default_modules;
                console.log(`[Research Service] Using provided module names:`, modulesToCreate);
            } else {
                // Get all default modules from research type
                const typeQuery = 'SELECT default_modules FROM research_types WHERE id = $1';
                const typeResult = await client.query(typeQuery, [research_type_id]);
                
                if (typeResult.rows.length > 0 && typeResult.rows[0].default_modules) {
                    const defaultModules = typeResult.rows[0].default_modules || [];
                    modulesToCreate = defaultModules.map((m: any) => m.name);
                    console.log(`[Research Service] Auto-detected default modules from research type:`, modulesToCreate);
                }
            }
            
            if (modulesToCreate.length > 0) {
                // Separate stage templates from individual modules
                // "Smart VOC" and "Cognitive Task" are stage templates, not individual modules
                // "Welcome Screen" and "Thank You Screen" are also stage templates (single_module)
                const stageTemplateNames = ['Smart VOC', 'Cognitive Task', 'Cognitive Tasks', 'Welcome Screen', 'Thank You Screen', 'Thank you screen'];
                const individualModules: string[] = [];
                const stagesToCreate: string[] = [];
                
                for (const name of modulesToCreate) {
                    // Normalize names for stage template lookup
                    let normalizedName = name;
                    if (name === 'Cognitive Task') {
                        normalizedName = 'Cognitive Tasks';
                    } else if (name === 'Thank you screen') {
                        normalizedName = 'Thank You Screen';
                    }
                    
                    if (stageTemplateNames.includes(name) || stageTemplateNames.includes(normalizedName)) {
                        stagesToCreate.push(normalizedName); // Use normalized name
                    } else {
                        individualModules.push(name);
                    }
                }
                
                // Create stages from stage templates first (these will create their own modules)
                for (const stageName of stagesToCreate) {
                    console.log(`[Research Service] Creating stage from template: ${stageName}`);
                    await createStageFromTemplateInternal(client, research.id, stageName);
                }
                
                // Then create any remaining individual modules in a default stage
                if (individualModules.length > 0) {
                    const defaultModulesStage = await createDefaultModulesStage(client, research.id, research_type_id);
                    console.log(`[Research Service] Created default modules stage:`, defaultModulesStage.id, defaultModulesStage.name);
                    console.log(`[Research Service] Creating ${individualModules.length} individual modules in stage ${defaultModulesStage.id}:`, individualModules);
                    await cloneTemplateModulesInternal(client, research.id, research_type_id, individualModules, defaultModulesStage.id);
                    console.log(`[Research Service] Successfully cloned ${individualModules.length} individual modules in stage ${defaultModulesStage.id}`);
                } else {
                    console.log(`[Research Service] No individual modules to create (all were stages)`);
                }
            } else {
                console.log(`[Research Service] No default modules to create`);
            }
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

/**
 * Creates a stage for default modules from research type
 */
const createDefaultModulesStage = async (client: PoolClient, researchId: string, researchTypeId: string): Promise<{ id: string; name: string }> => {
    // Get research type name for stage name
    const typeQuery = 'SELECT name FROM research_types WHERE id = $1';
    const typeResult = await client.query(typeQuery, [researchTypeId]);
    const typeName = typeResult.rows[0]?.name || 'Default Modules';

    // Get the maximum order_index for this research
    const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(order_index), 0) as max_order FROM stages WHERE research_id = $1',
        [researchId]
    );
    const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

    // Create the stage
    const stageQuery = `
        INSERT INTO stages (research_id, name, description, order_index, stage_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, order_index, stage_type
    `;
    const stageResult = await client.query(stageQuery, [
        researchId,
        typeName,
        `Default modules for ${typeName}`,
        nextOrder,
        'module_collection'
    ]);

    return stageResult.rows[0];
};

const cloneTemplateModulesInternal = async (client: PoolClient, researchId: string, researchTypeId: string, moduleNames: string[], stageId: string) => {
    console.log(`[cloneTemplateModulesInternal] Called with stageId: ${stageId}, moduleNames:`, moduleNames);
    
    // Get research type with default_modules
    const typeQuery = 'SELECT default_modules FROM research_types WHERE id = $1';
    const typeResult = await client.query(typeQuery, [researchTypeId]);

    if (typeResult.rows.length === 0) {
        throw new Error('Research type not found');
    }

    const defaultModules = typeResult.rows[0].default_modules || [];
    console.log(`[cloneTemplateModulesInternal] Found ${defaultModules.length} default modules in research type`);
    console.log(`[cloneTemplateModulesInternal] Requested module names:`, moduleNames);

    // Filter modules by names
    const modulesToClone = defaultModules.filter((m: any) => moduleNames.includes(m.name));
    console.log(`[cloneTemplateModulesInternal] Filtered to ${modulesToClone.length} modules to clone:`, modulesToClone.map((m: any) => m.name));

    if (modulesToClone.length === 0) {
        console.warn(`[cloneTemplateModulesInternal] No modules found matching names:`, moduleNames);
        console.warn(`[cloneTemplateModulesInternal] Available modules:`, defaultModules.map((m: any) => m.name));
    }

    // Create modules and questions
    for (const templateModule of modulesToClone) {
        console.log(`[cloneTemplateModulesInternal] Creating module: ${templateModule.name}`);
        
        // Try to get the module template structure if config is empty
        let moduleConfig = templateModule.config || {};
        
        // If config is empty, try to get it from module_templates table
        if (!moduleConfig || Object.keys(moduleConfig).length === 0) {
            console.log(`[cloneTemplateModulesInternal] Config is empty, fetching from module_templates for: ${templateModule.name}`);
            
            // Normalize module name for lookup (handle case variations)
            const normalizedName = templateModule.name
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            // Try exact match first, then case-insensitive match
            let templateQuery = 'SELECT structure FROM module_templates WHERE name = $1 AND is_active = true';
            let templateResult = await client.query(templateQuery, [templateModule.name]);
            
            if (templateResult.rows.length === 0 && normalizedName !== templateModule.name) {
                console.log(`[cloneTemplateModulesInternal] Trying normalized name: ${normalizedName}`);
                templateResult = await client.query(templateQuery, [normalizedName]);
            }
            
            // If still not found, try case-insensitive search
            if (templateResult.rows.length === 0) {
                console.log(`[cloneTemplateModulesInternal] Trying case-insensitive search`);
                templateQuery = 'SELECT structure FROM module_templates WHERE LOWER(name) = LOWER($1) AND is_active = true';
                templateResult = await client.query(templateQuery, [templateModule.name]);
            }
            
            if (templateResult.rows.length > 0 && templateResult.rows[0].structure) {
                let structure = templateResult.rows[0].structure;
                
                // Parse if string
                if (typeof structure === 'string') {
                    try {
                        structure = JSON.parse(structure);
                    } catch (e) {
                        console.error(`[cloneTemplateModulesInternal] Error parsing structure:`, e);
                        structure = {};
                    }
                }
                
                // Ensure structure is an object
                if (structure && typeof structure === 'object' && !Array.isArray(structure)) {
                    moduleConfig = {
                        structure: structure
                    };
                    console.log(`[cloneTemplateModulesInternal] Found structure in module_templates for ${templateModule.name}`);
                } else {
                    console.warn(`[cloneTemplateModulesInternal] Invalid structure format for ${templateModule.name}`);
                }
            } else {
                console.warn(`[cloneTemplateModulesInternal] No module template found for ${templateModule.name}`);
            }
        }
        
        const moduleQuery = `
      INSERT INTO modules (research_id, stage_id, name, description, order_index, is_from_template, config)
      VALUES ($1, $2, $3, $4, $5, true, $6)
      RETURNING id
    `;
        const moduleResult = await client.query(moduleQuery, [
            researchId,
            stageId,
            templateModule.name,
            templateModule.description,
            templateModule.order,
            JSON.stringify(moduleConfig),
        ]);

        const moduleId = moduleResult.rows[0].id;
        console.log(`[cloneTemplateModulesInternal] Created module ${templateModule.name} with ID: ${moduleId} in stage ${stageId}`);

        // Create questions for this module
        if (templateModule.questions && Array.isArray(templateModule.questions)) {
            console.log(`[cloneTemplateModulesInternal] Creating ${templateModule.questions.length} questions for module ${templateModule.name}`);
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

/**
 * Creates a stage from a stage template (internal, used during research creation)
 * @param client - Database client (transaction)
 * @param researchId - ID of the research
 * @param stageTemplateName - Name of the stage template
 */
const createStageFromTemplateInternal = async (client: PoolClient, researchId: string, stageTemplateName: string): Promise<void> => {
    // Normalize stage name (handle "Cognitive Task" vs "Cognitive Tasks")
    const normalizedName = stageTemplateName === 'Cognitive Task' ? 'Cognitive Tasks' : stageTemplateName;
    
    // Find the stage template
    const templateQuery = 'SELECT id, stage_type, description FROM stage_templates WHERE name = $1 AND is_active = true';
    const templateResult = await client.query(templateQuery, [normalizedName]);
    
    if (templateResult.rows.length === 0) {
        console.warn(`[createStageFromTemplateInternal] Stage template "${normalizedName}" not found`);
        return;
    }
    
    const stageTemplate = templateResult.rows[0];
    const stageTemplateId = stageTemplate.id;
    const stageType = stageTemplate.stage_type || 'module_collection';
    const stageDescription = stageTemplate.description || `Default modules for ${normalizedName}`;
    
    // Get the maximum order_index for this research
    const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(order_index), 0) as max_order FROM stages WHERE research_id = $1',
        [researchId]
    );
    const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
    
    // Create the stage
    const stageQuery = `
        INSERT INTO stages (research_id, name, description, order_index, stage_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, description, order_index, stage_type
    `;
    const stageResult = await client.query(stageQuery, [
        researchId,
        normalizedName,
        stageDescription,
        nextOrder,
        stageType
    ]);
    const newStage = stageResult.rows[0];
    
    console.log(`[createStageFromTemplateInternal] Created stage "${normalizedName}" with ID: ${newStage.id}`);
    
    // Get modules associated with this stage template
    let modulesQuery = `
        SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
        FROM stage_templates_module_templates stmt
        JOIN module_templates mt ON stmt.module_template_id = mt.id
        WHERE stmt.stage_template_id = $1 AND mt.is_active = true
        ORDER BY stmt.display_order
    `;
    let modulesResult = await client.query(modulesQuery, [stageTemplateId]);
    
    // If no modules found and this is Cognitive Tasks, try to find modules by name
    if (modulesResult.rows.length === 0 && normalizedName === 'Cognitive Tasks') {
        console.log(`[createStageFromTemplateInternal] No modules associated with Cognitive Tasks stage template, searching by name...`);
        const cognitiveTaskModuleNames = [
            'Short Text',
            'Long Text',
            'Single Choice',
            'Multiple Choice',
            'Linear Scale',
            'Ranking',
            'Navigation Flow',
            'Preference Test'
        ];
        
        modulesQuery = `
            SELECT id, name, description, structure
            FROM module_templates
            WHERE name = ANY($1) AND is_active = true
            ORDER BY array_position($1, name)
        `;
        modulesResult = await client.query(modulesQuery, [cognitiveTaskModuleNames]);
        
        if (modulesResult.rows.length > 0) {
            console.log(`[createStageFromTemplateInternal] Found ${modulesResult.rows.length} Cognitive Tasks modules by name`);
            // Add display_order based on the order in the array
            modulesResult.rows.forEach((row, index) => {
                row.display_order = index;
            });
        }
    }
    
    // Create modules for this stage
    for (const templateModule of modulesResult.rows) {
        let structure = templateModule.structure;
        
        // Parse if string
        if (typeof structure === 'string') {
            try {
                structure = JSON.parse(structure);
            } catch (e) {
                console.error(`[createStageFromTemplateInternal] Error parsing structure for module "${templateModule.name}":`, e);
                structure = {};
            }
        }
        
        // Ensure structure is an object
        if (!structure || typeof structure !== 'object' || Array.isArray(structure)) {
            structure = {};
        }
        
        // Config must have the structure { structure: { components: [...] } }
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
        
        console.log(`[createStageFromTemplateInternal] Created module "${templateModule.name}" for stage "${normalizedName}"`);
    }
    
    if (modulesResult.rows.length === 0) {
        console.warn(`[createStageFromTemplateInternal] No modules found for stage template "${normalizedName}"`);
    }
};

/**
 * Adds default "Research Configuration" stage to a new research
 * @param client - Database client (transaction)
 * @param researchId - ID of the research
 * @param userId - ID of the user (for createStage)
 */
const addDefaultStage = async (client: PoolClient, researchId: string, userId: string): Promise<{ id: string } | null> => {
    try {
        // Check if "Research Configuration" stage template exists
        const stageTemplateQuery = `
            SELECT id, stage_type FROM stage_templates 
            WHERE name = 'Research Configuration' AND is_active = true
        `;
        const stageTemplateResult = await client.query(stageTemplateQuery);

        if (stageTemplateResult.rows.length === 0) {
            console.log('⚠️  Research Configuration stage template not found, skipping...');
            return null;
        }

        const stageTemplateId = stageTemplateResult.rows[0].id;
        const stageType = stageTemplateResult.rows[0].stage_type || 'single_module';

        // Get the maximum order_index for this research
        const maxOrderResult = await client.query(
            'SELECT COALESCE(MAX(order_index), 0) as max_order FROM stages WHERE research_id = $1',
            [researchId]
        );
        const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

        // Create the stage
        const stageQuery = `
            INSERT INTO stages (research_id, name, description, order_index, stage_type)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, description, order_index, stage_type
        `;
        const stageResult = await client.query(stageQuery, [
            researchId,
            'Research Configuration',
            'Research settings and recruitment configuration',
            nextOrder,
            stageType
        ]);
        const newStage = stageResult.rows[0];

        // Get modules associated with this stage template
        const modulesQuery = `
            SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
            FROM stage_templates_module_templates stmt
            JOIN module_templates mt ON stmt.module_template_id = mt.id
            WHERE stmt.stage_template_id = $1 AND mt.is_active = true
            ORDER BY stmt.display_order
        `;
        const modulesResult = await client.query(modulesQuery, [stageTemplateId]);

        // Create modules for this stage
        for (const templateModule of modulesResult.rows) {
            let structure = templateModule.structure;

            // Ensure structure is an object
            if (typeof structure === 'string') {
                try {
                    structure = JSON.parse(structure);
                } catch (e) {
                    console.error('Error parsing module structure:', e);
                    structure = {};
                }
            }

            if (!structure || typeof structure !== 'object' || Array.isArray(structure)) {
                structure = {};
            }

            // Config must have the structure { structure: { components: [...] } }
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

            console.log(`✓ Created default module "${templateModule.name}" for Research Configuration stage`);
        }

        console.log(`✓ Added default stage "Research Configuration" to research ${researchId}`);
        return newStage;
    } catch (error) {
        console.error('Error adding default Research Configuration stage:', error);
        // Don't throw - we don't want to fail research creation if default stage fails
        return null;
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

        console.log('[ResearchService] Starting stage deletion:', { researchId, userId, stageId });

        // Verificar que el research existe y pertenece al usuario
        const researchCheck = await client.query(
            'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [researchId, userId]
        );

        if (researchCheck.rows.length === 0) {
            console.error('[ResearchService] Research not found:', { researchId, userId });
            throw new Error('Research not found');
        }

        // Verificar que el stage existe y pertenece al research
        const stageCheck = await client.query(
            'SELECT id, name FROM stages WHERE id = $1 AND research_id = $2',
            [stageId, researchId]
        );

        if (stageCheck.rows.length === 0) {
            console.error('[ResearchService] Stage not found:', { stageId, researchId });
            throw new Error('Stage not found');
        }

        const stageName = stageCheck.rows[0].name;
        console.log('[ResearchService] Stage found:', { stageId, stageName });

        // Verificar si hay módulos asociados (para logging)
        const modulesCheck = await client.query(
            'SELECT COUNT(*) as count FROM modules WHERE stage_id = $1',
            [stageId]
        );
        const moduleCount = parseInt(modulesCheck.rows[0].count || '0', 10);
        console.log('[ResearchService] Modules to be deleted (CASCADE):', { stageId, moduleCount });

        // Eliminar el stage (CASCADE eliminará automáticamente los módulos asociados)
        const deleteResult = await client.query('DELETE FROM stages WHERE id = $1', [stageId]);
        
        if (deleteResult.rowCount === 0) {
            console.error('[ResearchService] No rows deleted:', { stageId });
            throw new Error('Failed to delete stage: no rows affected');
        }

        await client.query('COMMIT');
        console.log('[ResearchService] Stage deleted successfully:', { stageId, stageName, moduleCount });
        return { message: 'Stage deleted successfully' };
    } catch (error: unknown) {
        await client.query('ROLLBACK');
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('[ResearchService] Error deleting stage:', {
            researchId,
            userId,
            stageId,
            error: errorMessage,
            stack: errorStack
        });
        
        // Re-throw with more context if it's a database error
        if (error instanceof Error) {
            // Check for common database errors
            if (errorMessage.includes('foreign key') || errorMessage.includes('constraint')) {
                throw new Error(`Cannot delete stage: database constraint violation - ${errorMessage}`);
            }
            if (errorMessage.includes('violates foreign key')) {
                throw new Error('Cannot delete stage: it has dependencies that prevent deletion');
            }
        }
        
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Actualiza el order_index de múltiples módulos en un stage
 * @param stageId - ID del stage
 * @param userId - ID del usuario
 * @param updates - Array de {moduleId, order_index}
 * @returns Mensaje de confirmación
 */
export const updateModulesOrderInStage = async (
    stageId: string,
    userId: string,
    updates: Array<{ moduleId: string; order_index: number }>
): Promise<{ message: string }> => {
    const client = await pool.connect();
    console.log(`[updateModulesOrderInStage] Attempting to update order for ${updates.length} modules in stage ${stageId} by user ${userId}`);

    try {
        await client.query('BEGIN');

        // Verificar que el stage existe y obtener el research_id
        const stageCheck = await client.query(
            'SELECT id, research_id FROM stages WHERE id = $1',
            [stageId]
        );
        if (stageCheck.rows.length === 0) {
            console.warn(`[updateModulesOrderInStage] Stage ${stageId} not found`);
            throw new Error('Stage not found');
        }

        const researchId = stageCheck.rows[0].research_id;

        // Verificar que el research existe y pertenece al usuario
        const researchCheck = await client.query(
            'SELECT id FROM researches WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [researchId, userId]
        );
        if (researchCheck.rows.length === 0) {
            console.warn(`[updateModulesOrderInStage] Research ${researchId} not found or not owned by user ${userId}`);
            throw new Error('Research not found');
        }

        // Verificar que todos los módulos pertenecen al stage
        const moduleIds = updates.map(u => u.moduleId);
        const modulesCheck = await client.query(
            'SELECT id FROM modules WHERE id = ANY($1) AND stage_id = $2',
            [moduleIds, stageId]
        );
        if (modulesCheck.rows.length !== moduleIds.length) {
            console.warn(`[updateModulesOrderInStage] Some modules do not belong to stage ${stageId}`);
            throw new Error('One or more modules not found in this stage');
        }

        // Actualizar el order_index de cada módulo
        for (const { moduleId, order_index } of updates) {
            await client.query(
                'UPDATE modules SET order_index = $1 WHERE id = $2 AND stage_id = $3',
                [order_index, moduleId, stageId]
            );
            console.log(`[updateModulesOrderInStage] Updated module ${moduleId} to order_index ${order_index}`);
        }

        await client.query('COMMIT');
        console.log(`[updateModulesOrderInStage] Successfully updated order for ${updates.length} modules in stage ${stageId}`);
        return { message: 'Modules order updated successfully' };
    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error(`[updateModulesOrderInStage] Transaction rolled back due to error: ${error.message}`, error);
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
