import pool from '../../config/database';
import type { PoolClient } from '../../config/database';
import { buildOwnershipClause, ResearchData } from './research.helpers';

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
export const createStageFromTemplateInternal = async (client: PoolClient, researchId: string, stageTemplateName: string): Promise<void> => {
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
