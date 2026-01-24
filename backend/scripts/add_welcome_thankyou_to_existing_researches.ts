import path from 'path';
import dotenv from 'dotenv';
import { createPool, type Pool } from 'mysql2/promise';
import crypto from 'crypto';

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool: Pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

/**
 * Creates a stage from a stage template for an existing research
 */
const createStageFromTemplate = async (
    connection: any,
    researchId: string,
    stageTemplateName: string
): Promise<void> => {
    const normalizedName = stageTemplateName === 'Cognitive Task' ? 'Cognitive Tasks' : stageTemplateName;

    // Find the stage template
    const templateQuery = 'SELECT id, type as stage_type, description FROM stage_templates WHERE name = ? AND is_active = true';
    const [templateRows] = await connection.query(templateQuery, [normalizedName]);
    const templateResult = { rows: templateRows as Array<{ id: string; stage_type: string; description: string }> };

    if (templateResult.rows.length === 0) {
        console.warn(`[createStageFromTemplate] Stage template "${normalizedName}" not found`);
        return;
    }

    const stageTemplate = templateResult.rows[0];
    const stageTemplateId = stageTemplate.id;
    const stageType = stageTemplate.stage_type || 'single_module';
    const stageDescription = stageTemplate.description || `Default modules for ${normalizedName}`;

    // Check if stage already exists for this research
    const existingStageQuery = 'SELECT id FROM stages WHERE research_id = ? AND name = ?';
    const [existingStageRows] = await connection.query(existingStageQuery, [researchId, normalizedName]);
    const existingStageResult = { rows: existingStageRows as Array<{ id: string }> };

    if (existingStageResult.rows.length > 0) {
        console.log(`[createStageFromTemplate] Stage "${normalizedName}" already exists for research ${researchId}`);
        return;
    }

    // Get the maximum display_order for this research
    const [maxOrderRows] = await connection.query(
        'SELECT COALESCE(MAX(display_order), 0) as max_order FROM stages WHERE research_id = ?',
        [researchId]
    ) as [Array<{ max_order: number }>, unknown];
    const maxOrderResult = { rows: maxOrderRows };
    const nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1;

    // Create the stage (MySQL compatible - pre-generate UUID)
    const newStageId = crypto.randomUUID();
    const stageQuery = `
        INSERT INTO stages (id, research_id, name, description, display_order, stage_type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    await connection.query(stageQuery, [
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
        WHERE stmt.stage_template_id = ? AND mt.is_active = true
        ORDER BY stmt.display_order
    `;
    const [modulesRows] = await connection.query(modulesQuery, [stageTemplateId]);
    const modulesResult = { rows: modulesRows as Array<{ id: string; name: string; description: string; structure: unknown; display_order: number }> };

    if (modulesResult.rows.length === 0) {
        console.warn(`[createStageFromTemplate] No modules found for stage template "${normalizedName}"`);
        return;
    }

    // Create modules for this stage
    for (const templateModule of modulesResult.rows) {
        // Check if module already exists in this research
        const existingModuleQuery = `
            SELECT id FROM modules 
            WHERE research_id = ? AND name = ?
        `;
        const [existingModuleRows] = await connection.query(existingModuleQuery, [researchId, templateModule.name]);
        const existingModuleResult = { rows: existingModuleRows as Array<{ id: string }> };

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
        const [maxOrderIndexRows] = await connection.query(
            'SELECT COALESCE(MAX(order_index), 0) as max_order FROM modules WHERE stage_id = ?',
            [newStageId]
        ) as [Array<{ max_order: number }>, unknown];
        const maxOrderIndexResult = { rows: maxOrderIndexRows };
        const nextOrderIndex = (maxOrderIndexResult.rows[0]?.max_order || 0) + 1;

        // Create the module (MySQL compatible - pre-generate UUID)
        const newModuleId = crypto.randomUUID();
        const moduleQuery = `
            INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config)
            VALUES (?, ?, ?, ?, ?, ?, true, ?)
        `;
        await connection.query(moduleQuery, [
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
    const connection = await pool.getConnection();
    try {
        console.log('🔧 Adding Welcome Screen and Thank You Screen to existing researches...\n');
        await connection.beginTransaction();

        // First, check if we can find the specific research "Probando"
        const specificResearchQuery = "SELECT id, name, status FROM researches WHERE name LIKE ?";
        const [specificRows] = await connection.query(specificResearchQuery, ['%Probando%']);
        const specificResult = { rows: specificRows as Array<{ id: string; name: string; status: string }> };
        
        if (specificResult.rows.length > 0) {
            console.log(`\n✅ Found research "Probando": ${specificResult.rows[0].id}`);
            console.log(`   Status: ${specificResult.rows[0].status}\n`);
        } else {
            console.log('\n⚠️  Research "Probando" not found in database\n');
        }

        // Check stage templates status
        console.log('\n📋 Checking stage templates status...');
        const [stageTemplatesRows] = await connection.query(
            "SELECT name, is_active, type as stage_type FROM stage_templates WHERE name IN ('Welcome Screen', 'Thank You Screen')"
        ) as [Array<{ name: string; is_active: boolean; stage_type: string }>, unknown];
        const stageTemplatesCheck = { rows: stageTemplatesRows };
        
        for (const template of stageTemplatesCheck.rows) {
            console.log(`   ${template.name}: ${template.is_active ? '✅ Active' : '❌ Inactive'} (${template.stage_type})`);
        }

        // Get all researches (including draft, active, etc.)
        const researchesQuery = 'SELECT id, name, status FROM researches ORDER BY created_at DESC';
        const [researchesRows] = await connection.query(researchesQuery) as [Array<{ id: string; name: string; status: string }>, unknown];
        const researchesResult = { rows: researchesRows };

        console.log(`\nTotal researches in database: ${researchesResult.rows.length}`);

        if (researchesResult.rows.length === 0) {
            console.log('No researches found in database');
            await connection.rollback();
            return;
        }

        console.log(`\nFound ${researchesResult.rows.length} research(es)\n`);

        let addedCount = 0;
        let alreadyHasBoth = 0;
        let missingWelcome = 0;
        let missingThankYou = 0;
        let missingBoth = 0;

        for (const research of researchesResult.rows) {
            const researchId = research.id;
            const researchName = research.name;

            console.log(`\n📋 Processing research: "${researchName}" (${researchId})`);

            // Check if Welcome Screen exists
            const welcomeCheckQuery = `
                SELECT m.id FROM modules m
                JOIN stages s ON m.stage_id = s.id
                WHERE s.research_id = ? AND m.name = 'Welcome Screen'
            `;
            const [welcomeRows] = await connection.query(welcomeCheckQuery, [researchId]);
            const welcomeCheckResult = { rows: welcomeRows as Array<{ id: string }> };

            // Check if Thank You Screen exists
            const thankYouCheckQuery = `
                SELECT m.id FROM modules m
                JOIN stages s ON m.stage_id = s.id
                WHERE s.research_id = ? AND m.name = 'Thank You Screen'
            `;
            const [thankYouRows] = await connection.query(thankYouCheckQuery, [researchId]);
            const thankYouCheckResult = { rows: thankYouRows as Array<{ id: string }> };

            let addedToThis = false;
            const hasWelcome = welcomeCheckResult.rows.length > 0;
            const hasThankYou = thankYouCheckResult.rows.length > 0;

            // Track statistics
            if (hasWelcome && hasThankYou) {
                alreadyHasBoth++;
            } else if (!hasWelcome && !hasThankYou) {
                missingBoth++;
            } else if (!hasWelcome) {
                missingWelcome++;
            } else if (!hasThankYou) {
                missingThankYou++;
            }

            // Add Welcome Screen if it doesn't exist
            if (!hasWelcome) {
                console.log('  ➕ Adding Welcome Screen...');
                await createStageFromTemplate(connection, researchId, 'Welcome Screen');
                addedToThis = true;
            } else {
                console.log('  ✓ Welcome Screen already exists');
            }

            // Add Thank You Screen if it doesn't exist
            if (!hasThankYou) {
                console.log('  ➕ Adding Thank You Screen...');
                await createStageFromTemplate(connection, researchId, 'Thank You Screen');
                addedToThis = true;
            } else {
                console.log('  ✓ Thank You Screen already exists');
            }

            if (addedToThis) {
                addedCount++;
            }
        }

        await connection.commit();
        console.log(`\n✅ Successfully processed ${researchesResult.rows.length} research(es)`);
        console.log(`\n📊 Statistics:`);
        console.log(`   - Researches with both Welcome & Thank You: ${alreadyHasBoth}`);
        console.log(`   - Researches missing Welcome Screen: ${missingWelcome}`);
        console.log(`   - Researches missing Thank You Screen: ${missingThankYou}`);
        console.log(`   - Researches missing both: ${missingBoth}`);
        console.log(`   - Researches updated: ${addedCount}\n`);
    } catch (error) {
        await connection.rollback();
        console.error('❌ Error:', error);
        throw error;
    } finally {
        connection.release();
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
