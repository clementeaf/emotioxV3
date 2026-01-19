import dotenv from 'dotenv';
import path from 'path';
import { createPool, Pool } from 'mysql2/promise';
import { randomUUID } from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 10,
});

/**
 * Creates missing stage templates and associates modules with them
 */
const createMissingStageTemplates = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Creating missing stage templates and associating modules...\n');
        await connection.beginTransaction();

        // 1. Create Smart VOC stage template
        const [smartVOCStageRows] = await connection.query(
            'SELECT id FROM stage_templates WHERE name = ? AND is_active = true',
            ['Smart VOC']
        ) as any[];

        let smartVOCStageId: string;

        if (smartVOCStageRows.length > 0) {
            console.log('⚠️  Smart VOC stage template already exists. Using existing...');
            smartVOCStageId = smartVOCStageRows[0].id;
        } else {
            console.log('✨ Creating Smart VOC stage template...');
            smartVOCStageId = randomUUID();
            await connection.query(
                `INSERT INTO stage_templates (id, name, description, type, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
                [
                    smartVOCStageId,
                    'Smart VOC',
                    'Voice of Customer research modules including CSAT, CES, CV, NPS, NEV, and VOC',
                    'module_collection'
                ]
            );
            console.log(`✓ Created Smart VOC stage template: ${smartVOCStageId}`);
        }

        // Get all Smart VOC modules
        const [smartVOCModules] = await connection.query(
            `SELECT id, name FROM module_templates 
             WHERE name IN ('Customer Satisfaction Score (CSAT)', 'Customer Effort Score (CES)', 
                           'Cognitive Value (CV)', 'Net Promoter Score (NPS)', 
                           'Net Emotional Value (NEV)', 'Voice of Costumer (VOC)')
             AND is_active = true
             ORDER BY 
               CASE name
                 WHEN 'Customer Satisfaction Score (CSAT)' THEN 1
                 WHEN 'Customer Effort Score (CES)' THEN 2
                 WHEN 'Cognitive Value (CV)' THEN 3
                 WHEN 'Net Promoter Score (NPS)' THEN 4
                 WHEN 'Net Emotional Value (NEV)' THEN 5
                 WHEN 'Voice of Costumer (VOC)' THEN 6
               END`
        ) as any[];

        console.log(`\n📦 Found ${smartVOCModules.length} Smart VOC modules to associate:`);
        for (let i = 0; i < smartVOCModules.length; i++) {
            const module = smartVOCModules[i];
            console.log(`   ${i + 1}. ${module.name} (${module.id})`);

            // Check if association already exists
            const [existingAssoc] = await connection.query(
                'SELECT id FROM stage_templates_module_templates WHERE stage_template_id = ? AND module_template_id = ?',
                [smartVOCStageId, module.id]
            ) as any[];

            if (existingAssoc.length === 0) {
                await connection.query(
                    `INSERT INTO stage_templates_module_templates (id, stage_template_id, module_template_id, display_order)
                     VALUES (UUID(), ?, ?, ?)`,
                    [smartVOCStageId, module.id, i]
                );
                console.log(`     ✓ Associated with Smart VOC stage template (order: ${i})`);
            } else {
                console.log(`     ⚠️  Already associated`);
            }
        }

        // 2. Create Cognitive Tasks stage template
        const [cognitiveTasksStageRows] = await connection.query(
            'SELECT id FROM stage_templates WHERE name = ? AND is_active = true',
            ['Cognitive Tasks']
        ) as any[];

        let cognitiveTasksStageId: string;

        if (cognitiveTasksStageRows.length > 0) {
            console.log('\n⚠️  Cognitive Tasks stage template already exists. Using existing...');
            cognitiveTasksStageId = cognitiveTasksStageRows[0].id;
        } else {
            console.log('\n✨ Creating Cognitive Tasks stage template...');
            cognitiveTasksStageId = randomUUID();
            await connection.query(
                `INSERT INTO stage_templates (id, name, description, type, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
                [
                    cognitiveTasksStageId,
                    'Cognitive Tasks',
                    'Cognitive research modules including Short Text, Long Text, Single Choice, Multiple Choice, Linear Scale, Ranking, Navigation Flow, and Preference Test',
                    'module_collection'
                ]
            );
            console.log(`✓ Created Cognitive Tasks stage template: ${cognitiveTasksStageId}`);
        }

        // Get all Cognitive Tasks modules
        const [cognitiveTasksModules] = await connection.query(
            `SELECT id, name FROM module_templates 
             WHERE name IN ('Short Text', 'Long Text', 'Single Choice', 'Multiple Choice',
                           'Linear Scale', 'Ranking', 'Navigation Flow', 'Preference Test')
             AND is_active = true
             ORDER BY 
               CASE name
                 WHEN 'Short Text' THEN 1
                 WHEN 'Long Text' THEN 2
                 WHEN 'Single Choice' THEN 3
                 WHEN 'Multiple Choice' THEN 4
                 WHEN 'Linear Scale' THEN 5
                 WHEN 'Ranking' THEN 6
                 WHEN 'Navigation Flow' THEN 7
                 WHEN 'Preference Test' THEN 8
               END`
        ) as any[];

        console.log(`\n📦 Found ${cognitiveTasksModules.length} Cognitive Tasks modules to associate:`);
        for (let i = 0; i < cognitiveTasksModules.length; i++) {
            const module = cognitiveTasksModules[i];
            console.log(`   ${i + 1}. ${module.name} (${module.id})`);

            // Check if association already exists
            const [existingAssoc] = await connection.query(
                'SELECT id FROM stage_templates_module_templates WHERE stage_template_id = ? AND module_template_id = ?',
                [cognitiveTasksStageId, module.id]
            ) as any[];

            if (existingAssoc.length === 0) {
                await connection.query(
                    `INSERT INTO stage_templates_module_templates (id, stage_template_id, module_template_id, display_order)
                     VALUES (UUID(), ?, ?, ?)`,
                    [cognitiveTasksStageId, module.id, i]
                );
                console.log(`     ✓ Associated with Cognitive Tasks stage template (order: ${i})`);
            } else {
                console.log(`     ⚠️  Already associated`);
            }
        }

        await connection.commit();
        console.log('\n✅ Stage templates created and modules associated successfully!');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Failed to create stage templates:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

createMissingStageTemplates();
