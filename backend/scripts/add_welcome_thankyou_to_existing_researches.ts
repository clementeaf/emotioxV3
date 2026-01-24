import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import crypto from 'crypto';

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

/**
 * Creates a stage from a stage template for an existing research
 */
const createStageFromTemplate = async (
    client: any,
    researchId: string,
    stageTemplateName: string
): Promise<void> => {
    const normalizedName = stageTemplateName === 'Cognitive Task' ? 'Cognitive Tasks' : stageTemplateName;

    // Find the stage template
    const templateQuery = 'SELECT id, type as stage_type, description FROM stage_templates WHERE name = $1 AND is_active = true';
    const templateResult = await client.query(templateQuery, [normalizedName]);

    if (templateResult.rows.length === 0) {
        console.warn(`[createStageFromTemplate] Stage template "${normalizedName}" not found`);
        return;
    }

    const stageTemplate = templateResult.rows[0];
    const stageTemplateId = stageTemplate.id;
    const stageType = stageTemplate.stage_type || 'single_module';
    const stageDescription = stageTemplate.description || `Default modules for ${normalizedName}`;

    // Check if stage already exists for this research
    const existingStageQuery = 'SELECT id FROM stages WHERE research_id = $1 AND name = $2';
    const existingStageResult = await client.query(existingStageQuery, [researchId, normalizedName]);

    if (existingStageResult.rows.length > 0) {
        console.log(`[createStageFromTemplate] Stage "${normalizedName}" already exists for research ${researchId}`);
        return;
    }

    // Get the maximum display_order for this research
    const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM stages WHERE research_id = $1',
        [researchId]
    );
    const nextOrder = (maxOrderResult.rows[0].max_order || 0) + 1;

    // Create the stage (PostgreSQL compatible)
    const newStageId = crypto.randomUUID();
    const stageQuery = `
        INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
        VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await client.query(stageQuery, [
        newStageId,
        researchId,
        normalizedName,
        stageDescription,
        nextOrder,
        stageType,
    ]);

    console.log(`[createStageFromTemplate] Created stage "${normalizedName}" with ID: ${newStageId}`);

    // Get modules associated with this stage template
    const modulesQuery = `
        SELECT mt.id, mt.name, mt.description, mt.structure, stmt.display_order
        FROM stage_templates_module_templates stmt
        JOIN module_templates mt ON stmt.module_template_id = mt.id
        WHERE stmt.stage_template_id = $1 AND mt.is_active = true
        ORDER BY stmt.display_order
    `;
    const modulesResult = await client.query(modulesQuery, [stageTemplateId]);

    if (modulesResult.rows.length === 0) {
        console.warn(`[createStageFromTemplate] No modules found for stage template "${normalizedName}"`);
        return;
    }

    // Create modules for this stage
    for (const templateModule of modulesResult.rows) {
        // Check if module already exists in this research
        const existingModuleQuery = `
            SELECT id FROM modules 
            WHERE research_id = $1 AND name = $2
        `;
        const existingModuleResult = await client.query(existingModuleQuery, [researchId, templateModule.name]);

        if (existingModuleResult.rows.length > 0) {
            console.log(`[createStageFromTemplate] Module "${templateModule.name}" already exists for research ${researchId}`);
            continue;
        }

        let structure = templateModule.structure;

        // Ensure structure is an object
        if (typeof structure === 'string') {
            try {
                structure = JSON.parse(structure);
            } catch (e) {
                console.error(`[createStageFromTemplate] Error parsing structure for module "${templateModule.name}":`, e);
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

        // Get the maximum order_index for this stage
        const maxOrderIndexResult = await client.query(
            'SELECT COALESCE(MAX(order_index), 0) as max_order FROM modules WHERE stage_id = $1',
            [newStageId]
        );
        const nextOrderIndex = (maxOrderIndexResult.rows[0].max_order || 0) + 1;

        // Create the module
        const newModuleId = crypto.randomUUID();
        const moduleQuery = `
            INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config)
            VALUES ($1, $2, $3, $4, $5, $6, true, $7)
        `;
        await client.query(moduleQuery, [
            newModuleId,
            researchId,
            newStageId,
            templateModule.name,
            templateModule.description,
            nextOrderIndex,
            JSON.stringify(config),
        ]);

        console.log(`[createStageFromTemplate] Created module "${templateModule.name}" for stage "${normalizedName}"`);
    }
};

/**
 * Adds Welcome Screen and Thank You Screen to existing researches that don't have them
 */
const addWelcomeAndThankYouToExistingResearches = async (): Promise<void> => {
    const client = await pool.connect();
    try {
        console.log('🔧 Adding Welcome Screen and Thank You Screen to existing researches...\n');
        await client.query('BEGIN');

        // First, check if we can find the specific research "Probando"
        const specificResearchQuery = "SELECT id, name, status FROM researches WHERE name ILIKE $1";
        const specificResult = await client.query(specificResearchQuery, ['%Probando%']);
        
        if (specificResult.rows.length > 0) {
            console.log(`Found research "Probando": ${specificResult.rows[0].id}`);
        }

        // Get all researches (including draft, active, etc.)
        const researchesQuery = 'SELECT id, name, status FROM researches ORDER BY created_at DESC';
        const researchesResult = await client.query(researchesQuery);

        console.log(`Total researches in database: ${researchesResult.rows.length}`);

        if (researchesResult.rows.length === 0) {
            console.log('No researches found in database');
            await client.query('ROLLBACK');
            return;
        }

        console.log(`Found ${researchesResult.rows.length} research(es)\n`);

        let addedCount = 0;

        for (const research of researchesResult.rows) {
            const researchId = research.id;
            const researchName = research.name;

            console.log(`\n📋 Processing research: "${researchName}" (${researchId})`);

            // Check if Welcome Screen exists
            const welcomeCheckQuery = `
                SELECT m.id FROM modules m
                JOIN stages s ON m.stage_id = s.id
                WHERE s.research_id = $1 AND m.name = 'Welcome Screen'
            `;
            const welcomeCheckResult = await client.query(welcomeCheckQuery, [researchId]);

            // Check if Thank You Screen exists
            const thankYouCheckQuery = `
                SELECT m.id FROM modules m
                JOIN stages s ON m.stage_id = s.id
                WHERE s.research_id = $1 AND m.name = 'Thank You Screen'
            `;
            const thankYouCheckResult = await client.query(thankYouCheckQuery, [researchId]);

            let addedToThis = false;

            // Add Welcome Screen if it doesn't exist
            if (welcomeCheckResult.rows.length === 0) {
                console.log('  ➕ Adding Welcome Screen...');
                await createStageFromTemplate(client, researchId, 'Welcome Screen');
                addedToThis = true;
            } else {
                console.log('  ✓ Welcome Screen already exists');
            }

            // Add Thank You Screen if it doesn't exist
            if (thankYouCheckResult.rows.length === 0) {
                console.log('  ➕ Adding Thank You Screen...');
                await createStageFromTemplate(client, researchId, 'Thank You Screen');
                addedToThis = true;
            } else {
                console.log('  ✓ Thank You Screen already exists');
            }

            if (addedToThis) {
                addedCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`\n✅ Successfully processed ${researchesResult.rows.length} research(es)`);
        console.log(`   Added modules to ${addedCount} research(es)\n`);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

// Run if executed directly
if (require.main === module) {
    addWelcomeAndThankYouToExistingResearches().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { addWelcomeAndThankYouToExistingResearches };
