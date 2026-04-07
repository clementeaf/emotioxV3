import pool from '../../config/database';
import type { PoolClient } from '../../config/database';
import cache, { CacheKeys } from '../../config/cache';

/**
 * Admin users bypass the created_by ownership filter.
 * Returns { clause, params } to inject into WHERE conditions.
 * Usage: `WHERE r.id = ? AND ${clause}` with [...otherParams, ...params]
 */
export const buildOwnershipClause = (userId: string, role?: string, alias = 'r') => {
    if (role === 'admin') {
        return { clause: '1=1', params: [] as string[] };
    }
    const prefix = alias ? `${alias}.` : '';
    return { clause: `${prefix}created_by = ?`, params: [userId] };
};

export interface ResearchData {
    name: string;
    description?: string;
    research_type_id?: string;
    research_technique_id?: string;
    enterprise_id?: string;
    settings?: Record<string, unknown>;
    use_default_modules?: string[]; // Module names to clone from template
    skip_default_modules?: boolean; // Skip all default module creation (file-based research)
}

export const list = async (userId: string, role?: string) => {
    try {
        console.log('[Research Service] list() called for userId:', userId, 'role:', role);
        const ownership = buildOwnershipClause(userId, role);
        // MySQL uses 'config' instead of 'settings', map it to 'settings' for frontend compatibility
        const query = `
        SELECT r.id, r.name, r.description, r.status, r.research_type_id, r.config, r.created_at, r.updated_at,
               rt.name as research_type_name,
               rtech.name as research_technique_name,
               e.name as enterprise_name,
               u.first_name as creator_first_name, u.last_name as creator_last_name, u.email as creator_email
        FROM researches r
        LEFT JOIN research_types rt ON r.research_type_id = rt.id
        LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
        LEFT JOIN enterprises e ON r.enterprise_id = e.id
        LEFT JOIN users u ON r.created_by = u.id
        WHERE ${ownership.clause} AND r.deleted_at IS NULL
        ORDER BY r.created_at DESC
      `;
        console.log('[Research Service] Executing query with userId:', userId);
        const result = await pool.query(query, [...ownership.params]);
        console.log('[Research Service] Query result:', {
            rowCount: result.rowCount,
            rowsLength: result.rows.length,
            firstRow: result.rows[0] || null
        });
        
        // Ensure each research has an empty stages array if not present
        // Map 'config' to 'settings' for frontend compatibility (MySQL uses 'config', frontend expects 'settings')
        // Also parse config/settings if it's a string (MySQL JSON fields can come as strings)
        const researches = result.rows.map((research: Record<string, unknown>) => {
            let settings = research.config || research.settings;
            if (typeof settings === 'string') {
                try {
                    settings = JSON.parse(settings);
                } catch (parseError) {
                    console.warn('[Research Service] Failed to parse config/settings JSON:', parseError);
                    settings = {};
                }
            }
            
            // Remove 'config' from response and use 'settings' instead for frontend compatibility
            const { config, ...researchWithoutConfig } = research;
            
            return {
                ...researchWithoutConfig,
                settings: settings || {},
                stages: research.stages || []
            };
        });
        
        return researches;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error('[Research Service] Error in list():', {
            userId,
            error: errorMessage,
            stack: errorStack
        });
        throw error;
    }
};

export const create = async (userId: string, data: ResearchData) => {
    console.log('[Research Service] create() called with data:', JSON.stringify(data, null, 2));
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let { description } = data;
        const { name, research_type_id, research_technique_id, enterprise_id, settings = {}, use_default_modules = [], skip_default_modules = false } = data;
        console.log('[Research Service] Extracted values - research_type_id:', research_type_id, 'research_technique_id:', research_technique_id, 'use_default_modules:', use_default_modules);

        // Validate research_technique_id exists if provided
        let validatedTechniqueId: string | null = null;
        let techniqueDefaultStages: Array<{ name: string; order: number; is_default: boolean }> | null = null;
        if (research_technique_id && research_technique_id.trim() !== '') {
            // Check if technique exists and get default_stages
            const techniqueQuery = 'SELECT id, description, default_stages FROM research_techniques WHERE id = ?';
            const techniqueResult = await client.query(techniqueQuery, [research_technique_id.trim()]);
            if (techniqueResult.rows.length === 0) {
                throw new Error(`Research technique with id ${research_technique_id} not found`);
            }
            validatedTechniqueId = research_technique_id.trim();

            // If description is not provided, use the technique's description
            if (!description && techniqueResult.rows[0].description) {
                description = techniqueResult.rows[0].description;
            }

            // Parse default_stages from technique (MySQL may return as string)
            let rawDefaultStages = techniqueResult.rows[0].default_stages;
            if (typeof rawDefaultStages === 'string') {
                try {
                    rawDefaultStages = JSON.parse(rawDefaultStages);
                } catch {
                    rawDefaultStages = null;
                }
            }
            if (Array.isArray(rawDefaultStages) && rawDefaultStages.length > 0) {
                techniqueDefaultStages = rawDefaultStages;
                console.log('[Research Service] Technique has default_stages:', techniqueDefaultStages.map(s => s.name));
            }
        }

        // Create research (MySQL compatible - pre-generate UUID)
        // MySQL uses 'config' instead of 'settings'
        const researchId = crypto.randomUUID();
        const researchQuery = `
      INSERT INTO researches (id, created_by, name, description, research_type_id, research_technique_id, enterprise_id, config, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())
    `;
        await client.query(researchQuery, [
            researchId,
            userId,
            name,
            description || null,
            research_type_id || null,
            validatedTechniqueId,
            enterprise_id || null,
            JSON.stringify(settings),
        ]);

        // Fetch the created research (MySQL doesn't support RETURNING)
        // Map 'config' to 'settings' for frontend compatibility
        const selectResult = await client.query(
            `SELECT id, name, description, status, research_type_id, research_technique_id, enterprise_id, config, created_at
             FROM researches WHERE id = ?`,
            [researchId]
        );
        const rawResearch = selectResult.rows[0] as Record<string, unknown>;
        // Map config to settings for frontend compatibility
        const { config, ...researchWithoutConfig } = rawResearch;
        const research = {
            ...researchWithoutConfig,
            settings: typeof config === 'string' ? JSON.parse(config) : (config || {})
        } as typeof rawResearch & { settings: Record<string, unknown>; id: string };

        // Automatically add "Research Configuration" stage to all new researches FIRST
        // Skip if technique default_stages already includes it (will be created in correct order)
        const techniqueIncludesResearchConfig = techniqueDefaultStages?.some(s => s.name === 'Research Configuration');
        if (!techniqueIncludesResearchConfig) {
            await addDefaultStage(client, research.id as string, userId);
        }

        // Clone modules from template if requested and associate them to a stage
        // Priority: 1) technique default_stages, 2) use_default_modules from frontend, 3) research type default_modules
        // File-based research (Attention Prediction, Insights Finding) skips all default modules
        if (!skip_default_modules && (research_type_id || techniqueDefaultStages)) {
            console.log(`[Research Service] Creating default stages/modules. technique defaults:`, techniqueDefaultStages ? 'yes' : 'no', 'research_type_id:', research_type_id);
            console.log(`[Research Service] use_default_modules:`, use_default_modules);

            let modulesToCreate: string[] = [];

            // Priority 1: If the technique has default_stages, use those
            if (techniqueDefaultStages) {
                modulesToCreate = techniqueDefaultStages
                    .sort((a, b) => a.order - b.order)
                    .map(s => s.name);
                console.log(`[Research Service] Using technique default_stages:`, modulesToCreate);
            }
            // Priority 2: If use_default_modules is provided from frontend, use it
            else if (use_default_modules && use_default_modules.length > 0) {
                modulesToCreate = use_default_modules;
                console.log(`[Research Service] Using provided module names:`, modulesToCreate);
            }
            // Priority 3: Fall back to research type default_modules
            else if (research_type_id) {
                const typeQuery = 'SELECT default_modules FROM research_types WHERE id = ?';
                const typeResult = await client.query(typeQuery, [research_type_id]);

                if (typeResult.rows.length > 0 && typeResult.rows[0].default_modules) {
                    let defaultModules: any[] = [];
                    const rawDefaultModules = typeResult.rows[0].default_modules;

                    // Parse JSON if it's a string (MySQL stores JSON as string)
                    if (typeof rawDefaultModules === 'string') {
                        try {
                            const parsed = JSON.parse(rawDefaultModules);
                            defaultModules = Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            console.warn(`[Research Service] Failed to parse default_modules JSON for research type ${research_type_id}:`, e);
                            defaultModules = [];
                        }
                    } else if (Array.isArray(rawDefaultModules)) {
                        defaultModules = rawDefaultModules;
                    } else {
                        console.warn(`[Research Service] default_modules is not an array or string for research type ${research_type_id}:`, typeof rawDefaultModules);
                        defaultModules = [];
                    }

                    if (defaultModules.length > 0) {
                        modulesToCreate = defaultModules.map((m: any) => m?.name).filter((name: string | undefined) => name !== undefined && name !== null);
                        console.log(`[Research Service] Auto-detected default modules from research type:`, modulesToCreate);
                    } else {
                        console.log(`[Research Service] No default modules found in research type ${research_type_id}`);
                    }
                }
            }
            
            if (modulesToCreate.length > 0) {
                // Separate stage templates from individual modules
                // "Smart VOC" and "Cognitive Task" are stage templates, not individual modules
                // "Welcome Screen" and "Thank You Screen" are also stage templates (single_module)
                const stageTemplateNames = ['Smart VOC', 'Cognitive Task', 'Cognitive Tasks', 'Welcome Screen', 'Thank You Screen', 'Thank you screen', 'Screener', 'Implicit Association', 'Eye Tracking', 'Research Configuration'];
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
                        // Only add if not already in stagesToCreate (prevent duplicates)
                        if (!stagesToCreate.includes(normalizedName)) {
                            stagesToCreate.push(normalizedName); // Use normalized name
                        }
                    } else {
                        individualModules.push(name);
                    }
                }
                
                // Create stages from stage templates first (these will create their own modules)
                for (const stageName of stagesToCreate) {
                    console.log(`[Research Service] Creating stage from template: ${stageName}`);
                    await createStageFromTemplateInternal(client, research.id as string, stageName);
                }
                
                // Then create any remaining individual modules in a default stage
                if (individualModules.length > 0 && research_type_id) {
                    const defaultModulesStage = await createDefaultModulesStage(client, research.id as string, research_type_id);
                    console.log(`[Research Service] Created default modules stage:`, defaultModulesStage.id, defaultModulesStage.name);
                    console.log(`[Research Service] Creating ${individualModules.length} individual modules in stage ${defaultModulesStage.id}:`, individualModules);
                    await cloneTemplateModulesInternal(client, research.id as string, research_type_id, individualModules, defaultModulesStage.id);
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
        console.error('[Research Service] Error creating research:', error);
        // Provide more helpful error messages
        if (error instanceof Error) {
            if (error.message.includes('foreign key constraint') || error.message.includes('1452')) {
                throw new Error('Invalid research type, technique, or enterprise ID. Please verify your selections.');
            }
            if (error.message.includes('Duplicate entry')) {
                throw new Error('A research with this name already exists.');
            }
        }
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
    const typeQuery = 'SELECT name FROM research_types WHERE id = ?';
    const typeResult = await client.query(typeQuery, [researchTypeId]);
    const typeName = typeResult.rows[0]?.name || 'Default Modules';

    // Get the maximum display_order for this research (MySQL: stages uses display_order not order_index)
    const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM stages WHERE research_id = ?',
        [researchId]
    );
    const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

    // Create the stage (MySQL compatible - pre-generate UUID)
    const stageId = crypto.randomUUID();
    const stageQuery = `
        INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    await client.query(stageQuery, [
        stageId,
        researchId,
        typeName,
        `Default modules for ${typeName}`,
        nextOrder,
        'module_collection'
    ]);

    return { id: stageId, name: typeName };
};

const cloneTemplateModulesInternal = async (client: PoolClient, researchId: string, researchTypeId: string, moduleNames: string[], stageId: string) => {
    console.log(`[cloneTemplateModulesInternal] Called with stageId: ${stageId}, moduleNames:`, moduleNames);
    
    // Get research type with default_modules
    const typeQuery = 'SELECT default_modules FROM research_types WHERE id = ?';
    const typeResult = await client.query(typeQuery, [researchTypeId]);

    if (typeResult.rows.length === 0) {
        throw new Error('Research type not found');
    }

    // Parse default_modules from JSON string if needed
    let defaultModules: any[] = [];
    const rawDefaultModules = typeResult.rows[0].default_modules;
    
    if (rawDefaultModules) {
        // Parse JSON if it's a string (MySQL stores JSON as string)
        if (typeof rawDefaultModules === 'string') {
            try {
                const parsed = JSON.parse(rawDefaultModules);
                defaultModules = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.warn(`[cloneTemplateModulesInternal] Failed to parse default_modules JSON for research type ${researchTypeId}:`, e);
                defaultModules = [];
            }
        } else if (Array.isArray(rawDefaultModules)) {
            defaultModules = rawDefaultModules;
        } else {
            console.warn(`[cloneTemplateModulesInternal] default_modules is not an array or string for research type ${researchTypeId}:`, typeof rawDefaultModules);
            defaultModules = [];
        }
    }
    
    console.log(`[cloneTemplateModulesInternal] Found ${defaultModules.length} default modules in research type`);
    console.log(`[cloneTemplateModulesInternal] Requested module names:`, moduleNames);

    // Filter modules by names
    const modulesToClone = defaultModules.filter((m: any) => moduleNames.includes(m?.name));
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
            let templateQuery = 'SELECT structure FROM module_templates WHERE name = ? AND is_active = true';
            let templateResult = await client.query(templateQuery, [templateModule.name]);
            
            if (templateResult.rows.length === 0 && normalizedName !== templateModule.name) {
                console.log(`[cloneTemplateModulesInternal] Trying normalized name: ${normalizedName}`);
                templateResult = await client.query(templateQuery, [normalizedName]);
            }
            
            // If still not found, try case-insensitive search
            if (templateResult.rows.length === 0) {
                console.log(`[cloneTemplateModulesInternal] Trying case-insensitive search`);
                templateQuery = 'SELECT structure FROM module_templates WHERE LOWER(name) = LOWER(?) AND is_active = true';
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
        
        // MySQL compatible - pre-generate UUID
        const moduleId = crypto.randomUUID();
        const moduleQuery = `
      INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config)
      VALUES (?, ?, ?, ?, ?, ?, true, ?)
    `;
        await client.query(moduleQuery, [
            moduleId,
            researchId,
            stageId,
            templateModule.name,
            templateModule.description,
            templateModule.order,
            JSON.stringify(moduleConfig),
        ]);
        console.log(`[cloneTemplateModulesInternal] Created module ${templateModule.name} with ID: ${moduleId} in stage ${stageId}`);

        // Create questions for this module
        if (templateModule.questions && Array.isArray(templateModule.questions)) {
            console.log(`[cloneTemplateModulesInternal] Creating ${templateModule.questions.length} questions for module ${templateModule.name}`);
            for (let i = 0; i < templateModule.questions.length; i++) {
                const q = templateModule.questions[i];
                const questionQuery = `
          INSERT INTO questions (module_id, question_type, question_text, order_index, config, validation, required)
          VALUES (?, ?, ?, ?, ?, ?, ?)
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
    const templateQuery = 'SELECT id, type as stage_type, description FROM stage_templates WHERE name = ? AND is_active = true';
    const templateResult = await client.query(templateQuery, [normalizedName]);

    if (templateResult.rows.length === 0) {
        console.warn(`[createStageFromTemplateInternal] Stage template "${normalizedName}" not found`);
        return;
    }

    const stageTemplate = templateResult.rows[0];
    const stageTemplateId = stageTemplate.id;
    const stageType = stageTemplate.stage_type || 'module_collection';
    const stageDescription = stageTemplate.description || `Default modules for ${normalizedName}`;

    // Get the maximum display_order for this research (MySQL: stages uses display_order)
    const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM stages WHERE research_id = ?',
        [researchId]
    );
    const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

    // Create the stage (MySQL compatible - pre-generate UUID)
    const newStageId = crypto.randomUUID();
    const stageQuery = `
        INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    await client.query(stageQuery, [
        newStageId,
        researchId,
        normalizedName,
        stageDescription,
        nextOrder,
        stageType
    ]);
    const newStage = { id: newStageId };
    
    console.log(`[createStageFromTemplateInternal] Created stage "${normalizedName}" with ID: ${newStage.id}`);
    
    // Get modules associated with this stage template.
    // For "Implicit Association", only auto-create the default module (display_order = 0 = "Attribute Testing").
    // The other IAT modules (Comparing Attribute, Objects Comparing) are available via the template drawer.
    const isImplicitAssociation = normalizedName === 'Implicit Association';
    let modulesQuery = `
        SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
        FROM stage_templates_module_templates stmt
        JOIN module_templates mt ON stmt.module_template_id = mt.id
        WHERE stmt.stage_template_id = ? AND mt.is_active = true${isImplicitAssociation ? ' AND stmt.display_order = 0' : ''}
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

        // MySQL compatible: use IN with FIELD() for ordering instead of array_position
        modulesQuery = `
            SELECT id, name, description, structure
            FROM module_templates
            WHERE name IN (${cognitiveTaskModuleNames.map(() => '?').join(',')}) AND is_active = true
            ORDER BY FIELD(name, ${cognitiveTaskModuleNames.map(() => '?').join(',')})
        `;
        // Need to pass the array twice: once for IN, once for FIELD
        modulesResult = await client.query(modulesQuery, [...cognitiveTaskModuleNames, ...cognitiveTaskModuleNames]);
        
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

        // MySQL compatible - pre-generate UUID (no RETURNING support)
        const newModuleId = crypto.randomUUID();
        const moduleQuery = `
            INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config)
            VALUES (?, ?, ?, ?, ?, ?, true, ?)
        `;
        await client.query(moduleQuery, [
            newModuleId,
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
const addDefaultStage = async (client: PoolClient, researchId: string, _userId: string): Promise<{ id: string } | null> => {
    try {
        // Check if "Research Configuration" stage template exists
        const stageTemplateQuery = `
            SELECT id, type as stage_type FROM stage_templates
            WHERE name = 'Research Configuration' AND is_active = true
        `;
        const stageTemplateResult = await client.query(stageTemplateQuery);

        if (stageTemplateResult.rows.length === 0) {
            console.log('⚠️  Research Configuration stage template not found, skipping...');
            return null;
        }

        const stageTemplateId = stageTemplateResult.rows[0].id;
        const stageType = stageTemplateResult.rows[0].stage_type || 'single_module';

        // Get the maximum display_order for this research (MySQL: stages uses display_order)
        const maxOrderResult = await client.query(
            'SELECT COALESCE(MAX(display_order), 0) as max_order FROM stages WHERE research_id = ?',
            [researchId]
        );
        const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

        // Create the stage (MySQL compatible - pre-generate UUID)
        const newStageId = crypto.randomUUID();
        const stageQuery = `
            INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await client.query(stageQuery, [
            newStageId,
            researchId,
            'Research Configuration',
            'Research settings and recruitment configuration',
            nextOrder,
            stageType
        ]);
        const newStage = { id: newStageId };

        // Get modules associated with this stage template
        const modulesQuery = `
            SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
            FROM stage_templates_module_templates stmt
            JOIN module_templates mt ON stmt.module_template_id = mt.id
            WHERE stmt.stage_template_id = ? AND mt.is_active = true
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

            // MySQL compatible - pre-generate UUID (no RETURNING support)
            const newModuleId = crypto.randomUUID();
            const moduleQuery = `
                INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config)
                VALUES (?, ?, ?, ?, ?, ?, true, ?)
            `;
            await client.query(moduleQuery, [
                newModuleId,
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

export const getById = async (researchId: string, userId: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role);
    // MySQL uses 'config' instead of 'settings', map it to 'settings' for frontend compatibility
    const query = `
    SELECT r.id, r.name, r.description, r.status, r.research_type_id, r.research_technique_id, r.config, r.created_at, r.updated_at,
           rt.name as research_type_name,
           rtech.name as research_technique_name,
           rtech.default_stages as technique_default_stages
    FROM researches r
    LEFT JOIN research_types rt ON r.research_type_id = rt.id
    LEFT JOIN research_techniques rtech ON r.research_technique_id = rtech.id
    WHERE r.id = ? AND ${ownership.clause} AND r.deleted_at IS NULL
  `;
    const result = await pool.query(query, [researchId, ...ownership.params]);

    if (result.rows.length === 0) {
        throw new Error('Research not found');
    }

    const rawResearch = result.rows[0] as Record<string, unknown>;
    // Map config to settings for frontend compatibility
    let settings = rawResearch.config;
    if (typeof settings === 'string') {
        try {
            settings = JSON.parse(settings);
        } catch (parseError) {
            console.warn('[Research Service] Failed to parse config JSON in getById:', parseError);
            settings = {};
        }
    }
    // Parse technique_default_stages from MySQL JSON string
    let techniqueDefaultStages = rawResearch.technique_default_stages;
    if (typeof techniqueDefaultStages === 'string') {
        try {
            techniqueDefaultStages = JSON.parse(techniqueDefaultStages);
        } catch {
            techniqueDefaultStages = null;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { config: _cfg, technique_default_stages: _tds, ...researchWithoutConfig } = rawResearch;
    const research = {
        ...researchWithoutConfig,
        settings: settings || {},
        technique_default_stages: techniqueDefaultStages || null,
    } as Record<string, unknown>;

    // Get stages with modules and questions (MySQL-compatible - split into multiple queries)
    // Step 1: Check if stage_type column exists
    const columnCheckQuery = `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'stages'
      AND COLUMN_NAME = 'stage_type'
    `;
    const columnCheckResult = await pool.query(columnCheckQuery);
    const hasStageTypeColumn = (columnCheckResult.rows[0] as { count: number }).count > 0;
    
    // Step 2: Get all stages (with or without stage_type depending on column existence)
    const stagesQuery = hasStageTypeColumn
        ? `SELECT id, name, description, display_order as order_index, stage_type
           FROM stages
           WHERE research_id = ?
           ORDER BY display_order`
        : `SELECT id, name, description, display_order as order_index, 'module_collection' as stage_type
           FROM stages
           WHERE research_id = ?
           ORDER BY display_order`;
    const stagesResult = await pool.query(stagesQuery, [researchId]);

    if (stagesResult.rows.length === 0) {
        research.stages = [];
    } else {
        // Step 2: Get all modules for these stages
        const stageIds = stagesResult.rows.map((s: Record<string, unknown>) => s.id);
        const modulesQuery = `
          SELECT id, stage_id, name, description, order_index, is_from_template, config
          FROM modules
          WHERE stage_id IN (${stageIds.map(() => '?').join(',')})
          ORDER BY order_index
        `;
        const modulesResult = await pool.query(modulesQuery, stageIds);

        // Step 3: Get all questions for these modules
        const moduleIds = modulesResult.rows.map((m: Record<string, unknown>) => m.id);
        let questionsResult: { rows: Array<Record<string, unknown>> } = { rows: [] };
        if (moduleIds.length > 0) {
            const questionsQuery = `
              SELECT id, module_id, question_type, question_text, order_index, config, validation, required
              FROM questions
              WHERE module_id IN (${moduleIds.map(() => '?').join(',')})
              ORDER BY order_index
            `;
            questionsResult = await pool.query(questionsQuery, moduleIds);
        }

        // Group questions by module_id
        const questionsByModule = new Map<string, Array<Record<string, unknown>>>();
        for (const q of questionsResult.rows) {
            const moduleId = q.module_id as string;
            if (!questionsByModule.has(moduleId)) {
                questionsByModule.set(moduleId, []);
            }
            questionsByModule.get(moduleId)!.push(q);
        }

        // Group modules by stage_id
        const modulesByStage = new Map<string, Array<Record<string, unknown>>>();
        for (const m of modulesResult.rows) {
            const stageId = m.stage_id as string;
            if (!modulesByStage.has(stageId)) {
                modulesByStage.set(stageId, []);
            }
            modulesByStage.get(stageId)!.push(m);
        }

        // Assemble the structure
        research.stages = stagesResult.rows.map((stage: Record<string, unknown>) => {
            const stageId = stage.id as string;
            const stageModules = modulesByStage.get(stageId) || [];

            return {
                id: stageId,
                name: stage.name,
                description: stage.description,
                order_index: stage.order_index,
                stage_type: stage.stage_type,
                modules: stageModules.map((mod: Record<string, unknown>) => {
                    const modId = mod.id as string;
                    const modQuestions = questionsByModule.get(modId) || [];

                    // Parse config safely - MySQL may return JSON as string
                    let config = mod.config;
                    if (typeof config === 'string') {
                        try {
                            config = JSON.parse(config);
                        } catch (e) {
                            console.error('Error parsing module config:', e);
                            config = {};
                        }
                    }

                    return {
                        id: modId,
                        name: mod.name,
                        description: mod.description,
                        order_index: mod.order_index,
                        is_from_template: mod.is_from_template,
                        config: config || {},
                        questions: modQuestions.map((q: Record<string, unknown>) => {
                            let qConfig = q.config;
                            let qValidation = q.validation;
                            if (typeof qConfig === 'string') {
                                try { qConfig = JSON.parse(qConfig); } catch (_e) { qConfig = {}; }
                            }
                            if (typeof qValidation === 'string') {
                                try { qValidation = JSON.parse(qValidation); } catch (_e) { qValidation = {}; }
                            }
                            return {
                                id: q.id,
                                type: q.question_type,
                                text: q.question_text,
                                order: q.order_index,
                                config: qConfig,
                                validation: qValidation,
                                required: q.required
                            };
                        })
                    };
                })
            };
        });
    }

    return research;
};

export const update = async (researchId: string, userId: string, data: Partial<ResearchData>, role?: string) => {
    const { name, description, settings } = data;

    // MySQL compatible: use ? placeholders directly
    const updates: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }
    if (settings !== undefined) {
        // MySQL uses 'config' instead of 'settings'
        updates.push('config = ?');
        values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    const ownership = buildOwnershipClause(userId, role, '');
    values.push(researchId, ...ownership.params);

    const query = `
    UPDATE researches
    SET ${updates.join(', ')}
    WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL
  `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
        throw new Error('Research not found');
    }

    // Fetch updated record (MySQL doesn't support RETURNING)
    // Map 'config' to 'settings' for frontend compatibility
    const selectResult = await pool.query(
        'SELECT id, name, description, status, config, updated_at FROM researches WHERE id = ?',
        [researchId]
    );
    const rawResearch = selectResult.rows[0] as Record<string, unknown>;
    // Map config to settings for frontend compatibility
    let parsedSettings = rawResearch.config;
    if (typeof parsedSettings === 'string') {
        try {
            parsedSettings = JSON.parse(parsedSettings);
        } catch (parseError) {
            console.warn('[Research Service] Failed to parse config JSON in update:', parseError);
            parsedSettings = {};
        }
    }
    const { config, ...researchWithoutConfig } = rawResearch;
    return {
        ...researchWithoutConfig,
        settings: parsedSettings || {}
    } as typeof rawResearch & { settings: Record<string, unknown> };
};

export const updateStatus = async (researchId: string, userId: string, status: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role, '');
    // MySQL compatible: no RETURNING clause
    const query = `
    UPDATE researches
    SET status = ?
    WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL
  `;
    const result = await pool.query(query, [status, researchId, ...ownership.params]);

    if (result.rowCount === 0) {
        throw new Error('Research not found');
    }

    // Fetch updated record
    const selectResult = await pool.query(
        'SELECT id, name, status, updated_at FROM researches WHERE id = ?',
        [researchId]
    );
    return selectResult.rows[0];
};

/**
 * Activa una investigación cambiando su estado a 'active'
 * @param researchId - ID de la investigación
 * @param userId - ID del usuario propietario
 * @returns Investigación actualizada
 */
export const activate = async (researchId: string, userId: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role, '');
    // MySQL compatible: no RETURNING clause
    const query = `
    UPDATE researches
    SET status = 'active', updated_at = NOW()
    WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL
  `;
    const result = await pool.query(query, [researchId, ...ownership.params]);

    if (result.rowCount === 0) {
        throw new Error('Research not found');
    }

    // Invalidate public cache for this research
    cache.delete(`${CacheKeys.PUBLIC_RESEARCH}:${researchId}`);

    // Fetch updated record
    const selectResult = await pool.query(
        'SELECT id, name, status, updated_at FROM researches WHERE id = ?',
        [researchId]
    );
    return selectResult.rows[0];
};

export const deleteResearch = async (researchId: string, userId: string, role?: string) => {
    const ownership = buildOwnershipClause(userId, role, '');
    // MySQL compatible: no RETURNING clause
    // Note: MySQL CHECK constraint only allows: 'draft','active','paused','completed','archived'
    // We use 'archived' instead of 'deleted' to comply with the constraint
    // The deleted_at timestamp is the actual indicator of deletion
    const query = `
    UPDATE researches
    SET deleted_at = NOW(), status = 'archived'
    WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL
  `;
    const result = await pool.query(query, [researchId, ...ownership.params]);

    if (result.rowCount === 0) {
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
export const createStage = async (researchId: string, userId: string, stageName: string, description?: string, role?: string, defaultModuleName?: string) => {
    const client = await pool.connect();
    const ownership = buildOwnershipClause(userId, role, '');

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario (admin bypasses)
        const researchCheck = await client.query(
            `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
            [researchId, ...ownership.params]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Obtener el máximo display_order para este research (MySQL: stages uses display_order)
        const maxOrderResult = await client.query(
            'SELECT COALESCE(MAX(display_order), 0) as max_order FROM stages WHERE research_id = ?',
            [researchId]
        );
        const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

        // Buscar el stage_template para obtener el stage_type y módulos asociados
        const templateResult = await client.query(
            'SELECT id, type as stage_type FROM stage_templates WHERE name = ? AND is_active = true',
            [stageName]
        );

        let stageType: 'single_module' | 'module_collection' = 'module_collection';
        let stageTemplateId: string | null = null;
        let modulesToClone: Array<{ id: string; name: string; description: string; structure: Record<string, unknown>; display_order: number }> = [];

        if (templateResult.rows.length > 0) {
            stageTemplateId = templateResult.rows[0].id;
            stageType = templateResult.rows[0].stage_type || 'module_collection';

            // Obtener módulos asociados al stage template.
            // Para Implicit Association, solo auto-crear el módulo seleccionado por el usuario (defaultModuleName).
            // Si no se especifica, usa display_order=0 (Attribute Testing por defecto).
            const isImplicitAssociation = stageName === 'Implicit Association';
            let iatFilter = '';
            const queryParams: unknown[] = [stageTemplateId];
            if (isImplicitAssociation) {
                if (defaultModuleName) {
                    iatFilter = ' AND mt.name = ?';
                    queryParams.push(defaultModuleName);
                } else {
                    iatFilter = ' AND stmt.display_order = 0';
                }
            }
            const modulesResult = await client.query(
                `SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
                 FROM stage_templates_module_templates stmt
                 JOIN module_templates mt ON stmt.module_template_id = mt.id
                 WHERE stmt.stage_template_id = ? AND mt.is_active = true${iatFilter}
                 ORDER BY stmt.display_order`,
                queryParams
            );
            modulesToClone = modulesResult.rows as Array<{ id: string; name: string; description: string; structure: Record<string, unknown>; display_order: number }>;
        }

        // Crear el stage con el stage_type del template (MySQL compatible - pre-generate UUID)
        const newStageId = crypto.randomUUID();
        const stageQuery = `
            INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        await client.query(stageQuery, [
            newStageId,
            researchId,
            stageName,
            description || null,
            nextOrder,
            stageType
        ]);
        const newStage = { id: newStageId };

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

                // MySQL compatible - pre-generate UUID (no RETURNING support)
                const newModuleId = crypto.randomUUID();
                const moduleQuery = `
                    INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config)
                    VALUES (?, ?, ?, ?, ?, ?, true, ?)
                `;
                await client.query(moduleQuery, [
                    newModuleId,
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
export const deleteStage = async (researchId: string, userId: string, stageId: string, role?: string) => {
    const client = await pool.connect();
    const ownership = buildOwnershipClause(userId, role, '');

    try {
        await client.query('BEGIN');

        console.log('[ResearchService] Starting stage deletion:', { researchId, userId, stageId });

        // Verificar que el research existe y pertenece al usuario (admin bypasses)
        const researchCheck = await client.query(
            `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
            [researchId, ...ownership.params]
        );

        if (researchCheck.rows.length === 0) {
            console.error('[ResearchService] Research not found:', { researchId, userId });
            throw new Error('Research not found');
        }

        // Verificar que el stage existe y pertenece al research
        const stageCheck = await client.query(
            'SELECT id, name FROM stages WHERE id = ? AND research_id = ?',
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
            'SELECT COUNT(*) as count FROM modules WHERE stage_id = ?',
            [stageId]
        );
        const moduleCount = parseInt(modulesCheck.rows[0].count || '0', 10);
        console.log('[ResearchService] Modules to be deleted (CASCADE):', { stageId, moduleCount });

        // Eliminar el stage (CASCADE eliminará automáticamente los módulos asociados)
        const deleteResult = await client.query('DELETE FROM stages WHERE id = ?', [stageId]);
        
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
    updates: Array<{ moduleId: string; order_index: number }>,
    role?: string
): Promise<{ message: string }> => {
    const client = await pool.connect();
    const ownership = buildOwnershipClause(userId, role, '');
    console.log(`[updateModulesOrderInStage] Attempting to update order for ${updates.length} modules in stage ${stageId} by user ${userId}`);

    try {
        await client.query('BEGIN');

        // Verificar que el stage existe y obtener el research_id
        const stageCheck = await client.query(
            'SELECT id, research_id FROM stages WHERE id = ?',
            [stageId]
        );
        if (stageCheck.rows.length === 0) {
            console.warn(`[updateModulesOrderInStage] Stage ${stageId} not found`);
            throw new Error('Stage not found');
        }

        const researchId = stageCheck.rows[0].research_id;

        // Verificar que el research existe y pertenece al usuario (admin bypasses)
        const researchCheck = await client.query(
            `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
            [researchId, ...ownership.params]
        );
        if (researchCheck.rows.length === 0) {
            console.warn(`[updateModulesOrderInStage] Research ${researchId} not found or not owned by user ${userId}`);
            throw new Error('Research not found');
        }

        // Verificar que todos los módulos pertenecen al stage
        const moduleIds = updates.map(u => u.moduleId);
        // MySQL compatible: use IN with dynamic placeholders instead of ANY($1)
        const modulesCheck = await client.query(
            `SELECT id FROM modules WHERE id IN (${moduleIds.map(() => '?').join(',')}) AND stage_id = ?`,
            [...moduleIds, stageId]
        );
        if (modulesCheck.rows.length !== moduleIds.length) {
            console.warn(`[updateModulesOrderInStage] Some modules do not belong to stage ${stageId}`);
            throw new Error('One or more modules not found in this stage');
        }

        // Actualizar el order_index de cada módulo
        for (const { moduleId, order_index } of updates) {
            await client.query(
                'UPDATE modules SET order_index = ? WHERE id = ? AND stage_id = ?',
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
export const deleteModule = async (researchId: string, userId: string, moduleId: string, role?: string) => {
    const client = await pool.connect();
    const ownership = buildOwnershipClause(userId, role, '');

    try {
        await client.query('BEGIN');

        // Verificar que el research existe y pertenece al usuario (admin bypasses)
        const researchCheck = await client.query(
            `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
            [researchId, ...ownership.params]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        // Verificar que el módulo existe y pertenece al research
        const moduleCheck = await client.query(
            'SELECT id FROM modules WHERE id = ? AND research_id = ?',
            [moduleId, researchId]
        );

        if (moduleCheck.rows.length === 0) {
            throw new Error('Module not found');
        }

        // Eliminar el módulo (CASCADE eliminará automáticamente las questions asociadas)
        await client.query('DELETE FROM modules WHERE id = ?', [moduleId]);

        await client.query('COMMIT');
        return { message: 'Module deleted successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Adds Welcome Screen and Thank You Screen to an existing research if they don't exist
 * @param researchId - ID of the research
 * @param userId - ID of the user
 * @returns Object with information about what was added
 */
export const addWelcomeAndThankYouStages = async (researchId: string, userId: string, role?: string): Promise<{ added: string[]; alreadyExists: string[] }> => {
    const client = await pool.connect();
    const ownership = buildOwnershipClause(userId, role, '');

    try {
        await client.query('BEGIN');

        // Verify that the research exists and belongs to the user (admin bypasses)
        const researchCheck = await client.query(
            `SELECT id FROM researches WHERE id = ? AND ${ownership.clause} AND deleted_at IS NULL`,
            [researchId, ...ownership.params]
        );

        if (researchCheck.rows.length === 0) {
            throw new Error('Research not found');
        }

        const added: string[] = [];
        const alreadyExists: string[] = [];

        // Check and add Welcome Screen
        // Check by STAGE name first (more reliable), then by module name as fallback
        const welcomeCheck = await client.query(
            `SELECT s.id FROM stages s
             WHERE s.research_id = ? AND s.name = 'Welcome Screen'
             UNION
             SELECT s.id FROM stages s
             JOIN modules m ON m.stage_id = s.id
             WHERE s.research_id = ? AND m.name = 'Welcome Screen'`,
            [researchId, researchId]
        );

        if (welcomeCheck.rows.length === 0) {
            await createStageFromTemplateInternal(client, researchId, 'Welcome Screen');
            added.push('Welcome Screen');
        } else {
            alreadyExists.push('Welcome Screen');
        }

        // Check and add Thank You Screen
        // Check by STAGE name first (more reliable), then by module name as fallback
        const thankYouCheck = await client.query(
            `SELECT s.id FROM stages s
             WHERE s.research_id = ? AND s.name = 'Thank You Screen'
             UNION
             SELECT s.id FROM stages s
             JOIN modules m ON m.stage_id = s.id
             WHERE s.research_id = ? AND m.name = 'Thank You Screen'`,
            [researchId, researchId]
        );

        if (thankYouCheck.rows.length === 0) {
            await createStageFromTemplateInternal(client, researchId, 'Thank You Screen');
            added.push('Thank You Screen');
        } else {
            alreadyExists.push('Thank You Screen');
        }

        await client.query('COMMIT');
        return { added, alreadyExists };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Research Service] Error adding Welcome/Thank You stages:', error);
        throw error;
    } finally {
        client.release();
    }
};
