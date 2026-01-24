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
 * Ensures Welcome Screen and Thank You Screen stage templates exist and are active
 */
const ensureWelcomeAndThankYouStageTemplates = async (): Promise<void> => {
    const client = await pool.connect();
    try {
        console.log('🔧 Ensuring Welcome Screen and Thank You Screen stage templates exist...\n');
        await client.query('BEGIN');

        const stageTemplates = [
            {
                name: 'Welcome Screen',
                description: 'Introduction screen for participants',
                stage_type: 'single_module',
                moduleName: 'Welcome Screen'
            },
            {
                name: 'Thank You Screen',
                description: 'Completion screen after research',
                stage_type: 'single_module',
                moduleName: 'Thank You Screen'
            }
        ];

        for (const template of stageTemplates) {
            console.log(`\n📋 Processing: ${template.name}`);

            // Check if stage template exists
            const checkQuery = 'SELECT id, is_active FROM stage_templates WHERE name = $1';
            const checkResult = await client.query(checkQuery, [template.name]);

            let stageTemplateId: string;

            if (checkResult.rows.length > 0) {
                stageTemplateId = checkResult.rows[0].id;
                const isActive = checkResult.rows[0].is_active;

                if (!isActive) {
                    console.log(`  ⚠️  Stage template exists but is inactive. Activating...`);
                    await client.query(
                        'UPDATE stage_templates SET is_active = true, stage_type = $1, updated_at = NOW() WHERE id = $2',
                        [template.stage_type, stageTemplateId]
                    );
                    console.log(`  ✅ Activated stage template`);
                } else {
                    console.log(`  ✓ Stage template exists and is active`);
                }
            } else {
                console.log(`  ➕ Creating stage template...`);
                const insertResult = await client.query(
                    'INSERT INTO stage_templates (id, name, description, stage_type, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, true, NOW(), NOW()) RETURNING id',
                    [crypto.randomUUID(), template.name, template.description, template.stage_type]
                );
                stageTemplateId = insertResult.rows[0].id;
                console.log(`  ✅ Created stage template with ID: ${stageTemplateId}`);
            }

            // Check if module template exists
            const moduleCheckQuery = 'SELECT id FROM module_templates WHERE name = $1 AND is_active = true';
            const moduleCheckResult = await client.query(moduleCheckQuery, [template.moduleName]);

            if (moduleCheckResult.rows.length === 0) {
                console.log(`  ⚠️  Module template "${template.moduleName}" not found or inactive`);
                console.log(`  ⚠️  Stage template will be created but without module association`);
                continue;
            }

            const moduleTemplateId = moduleCheckResult.rows[0].id;

            // Check if association exists
            const associationCheckQuery = `
                SELECT stage_template_id 
                FROM stage_templates_module_templates 
                WHERE stage_template_id = $1 AND module_template_id = $2
            `;
            const associationCheckResult = await client.query(associationCheckQuery, [stageTemplateId, moduleTemplateId]);

            if (associationCheckResult.rows.length === 0) {
                console.log(`  ➕ Associating module "${template.moduleName}" with stage template...`);
                await client.query(
                    'INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order) VALUES ($1, $2, $3)',
                    [stageTemplateId, moduleTemplateId, 0]
                );
                console.log(`  ✅ Associated module "${template.moduleName}" with stage template`);
            } else {
                console.log(`  ✓ Module "${template.moduleName}" already associated`);
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Welcome Screen and Thank You Screen stage templates ensured!\n');
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
    ensureWelcomeAndThankYouStageTemplates().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { ensureWelcomeAndThankYouStageTemplates };
