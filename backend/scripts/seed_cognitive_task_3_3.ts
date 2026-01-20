import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

/**
 * Crea el template de módulo "3.3" para Cognitive Tasks
 * Single Choice con:
 * - Input para título de pregunta
 * - Opciones dinámicas con elegibility (Qualify/Disqualify)
 * - Botón para agregar más opciones
 * - Cada opción puede ser borrada
 * - Área de carga de imagen opcional
 * - Checkbox para opción "Other"
 */
const seedCognitiveTask33 = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed for Cognitive Task 3.3 module...');
        await client.query('BEGIN');

        // Get a user ID to use as created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.log('No users found. Cannot seed module without a creator.');
            await client.query('ROLLBACK');
            return;
        }

        // Check if module already exists
        const checkModule = await client.query(
            'SELECT id FROM module_templates WHERE name = $1',
            ['3.3']
        );

        if (checkModule.rows.length > 0) {
            console.log('Module 3.3 already exists. Skipping...');
            await client.query('ROLLBACK');
            return;
        }

        // Get the Cognitive Tasks stage template ID
        const stageTemplateRes = await client.query(
            'SELECT id FROM stage_templates WHERE name = $1 AND is_active = true',
            ['Cognitive Tasks']
        );

        if (stageTemplateRes.rows.length === 0) {
            console.log('Cognitive Tasks stage template not found. Cannot associate module.');
            await client.query('ROLLBACK');
            return;
        }

        const stageTemplateId = stageTemplateRes.rows[0].id;

        // Create the 3.3 module
        const moduleRes = await client.query(
            `INSERT INTO module_templates (name, description, is_active, created_at, updated_at, created_by)
             VALUES ($1, $2, true, NOW(), NOW(), $3)
             RETURNING id`,
            [
                '3.3',
                'Cognitive task single choice question with dynamic options, eligibility, and optional image upload',
                userId
            ]
        );

        const moduleId = moduleRes.rows[0].id;
        console.log(`✓ Created module: 3.3 (${moduleId})`);

        // Define the module structure with components
        const structure = {
            components: [
                {
                    id: 'question-title',
                    name: 'Question Title',
                    type: 'input',
                    label: 'Question',
                    defaultValue: '',
                    placeholder: {
                        enabled: true,
                        text: 'Escribe la pregunta aquí...'
                    },
                    required: true,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'single-choice-container',
                    name: 'Single Choice',
                    type: 'radio',
                    label: 'Choices',
                    required: true,
                    order: 2,
                    settings: {
                        allowAddOptions: true,
                        allowDeleteOptions: true,
                        showOtherOption: false
                    },
                    choices: [
                        {
                            id: 'choice-1',
                            label: 'Option 1',
                            value: 'option-1',
                            eligibility: 'Qualify'
                        },
                        {
                            id: 'choice-2',
                            label: 'Option 2',
                            value: 'option-2',
                            eligibility: 'Disqualify'
                        },
                        {
                            id: 'choice-3',
                            label: 'Option 3',
                            value: 'option-3',
                            eligibility: 'Disqualify'
                        }
                    ]
                },
                {
                    id: 'image-upload',
                    name: 'Image Upload',
                    type: 'file-upload',
                    label: 'Upload (optional)',
                    required: false,
                    order: 3,
                    settings: {},
                    fileUpload: {
                        maxSizeMB: 5,
                        acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
                        recommendedResolution: '1000x1000px'
                    }
                },
                {
                    id: 'show-other-option',
                    name: 'Show Other Option',
                    type: 'checkbox',
                    label: 'Show "Other" option',
                    required: false,
                    order: 4,
                    settings: {}
                }
            ]
        };

        // Update the module with the structure
        await client.query(
            `UPDATE module_templates SET structure = $1 WHERE id = $2`,
            [JSON.stringify(structure), moduleId]
        );

        console.log('  ✓ Added 4 components:');
        console.log('    - Question Title (input)');
        console.log('    - Single Choice Container (radio) with 3 initial choices');
        console.log('      Each choice has: input + eligibility selector');
        console.log('      Button to add more choices');
        console.log('    - Image Upload (file-upload - optional)');
        console.log('    - Show Other Option (checkbox)');

        // Associate module with Cognitive Tasks stage template
        const maxOrderRes = await client.query(
            `SELECT COALESCE(MAX(display_order), -1) as max_order 
             FROM stage_templates_module_templates 
             WHERE stage_template_id = $1`,
            [stageTemplateId]
        );
        const nextOrder = (maxOrderRes.rows[0]?.max_order || -1) + 1;

        await client.query(
            `INSERT INTO stage_templates_module_templates (stage_template_id, module_template_id, display_order)
             VALUES ($1, $2, $3)
             ON CONFLICT (stage_template_id, module_template_id) 
             DO UPDATE SET display_order = $3`,
            [stageTemplateId, moduleId, nextOrder]
        );

        console.log(`  ✓ Associated with Cognitive Tasks stage (order: ${nextOrder})`);

        await client.query('COMMIT');
        console.log('\n✅ Cognitive Task 3.3 module created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

seedCognitiveTask33();

