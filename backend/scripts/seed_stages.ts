// Seed script to insert Stage Templates into the database
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seedStages() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding Stage Templates...');
        await client.query('BEGIN');

        // Define the stage templates
        const stages = [
            {
                name: 'Smart VOC',
                description: 'Voice of Customer analysis modules including satisfaction, effort, and qualitative feedback metrics.',
                modules: [
                    'Voice of Costumer (VOC)',
                    'Net Promoter Score (NPS)',
                    'Customer Satisfaction Score (CSAT)',
                    'Customer Effort Score (CES)',
                    'Cognitive Value (CV)',
                    'Net Emotional Value (NEV)'
                ]
            },
            {
                name: 'Cognitive Tasks',
                description: 'Cognitive assessment and task-based research modules.',
                modules: []
            }
        ];

        for (const stage of stages) {
            // Check if stage already exists
            const checkRes = await client.query(
                'SELECT id FROM stage_templates WHERE name = $1',
                [stage.name]
            );

            let stageId: string;

            if ((checkRes.rowCount ?? 0) > 0) {
                console.log(`⚠️  Stage "${stage.name}" already exists. Updating...`);
                const updateRes = await client.query(
                    'UPDATE stage_templates SET description = $1, updated_at = NOW() WHERE name = $2 RETURNING id',
                    [stage.description, stage.name]
                );
                stageId = updateRes.rows[0].id;

                // Clear existing module associations
                await client.query(
                    'DELETE FROM stage_templates_module_templates WHERE stage_template_id = $1',
                    [stageId]
                );
            } else {
                console.log(`✨ Creating stage "${stage.name}"...`);
                const insertRes = await client.query(
                    'INSERT INTO stage_templates (name, description) VALUES ($1, $2) RETURNING id',
                    [stage.name, stage.description]
                );
                stageId = insertRes.rows[0].id;
            }

            // Associate modules with the stage
            for (let i = 0; i < stage.modules.length; i++) {
                const moduleName = stage.modules[i];

                // Get module template ID
                const moduleRes = await client.query(
                    'SELECT id FROM module_templates WHERE name = $1',
                    [moduleName]
                );

                if (moduleRes.rows.length > 0) {
                    const moduleId = moduleRes.rows[0].id;

                    await client.query(
                        `INSERT INTO stage_templates_module_templates 
                        (stage_template_id, module_template_id, display_order) 
                        VALUES ($1, $2, $3)
                        ON CONFLICT (stage_template_id, module_template_id) 
                        DO UPDATE SET display_order = $3`,
                        [stageId, moduleId, i]
                    );

                    console.log(`  ✓ Associated module "${moduleName}" with stage "${stage.name}"`);
                } else {
                    console.log(`  ⚠️  Module "${moduleName}" not found, skipping...`);
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Stage Templates seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error seeding stage templates:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedStages();
