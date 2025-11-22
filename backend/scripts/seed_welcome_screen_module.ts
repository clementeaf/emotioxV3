import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const seedWelcomeScreenModule = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed for Welcome Screen module...');
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
            ['Welcome Screen']
        );

        if (checkModule.rows.length > 0) {
            console.log('Welcome Screen module already exists. Skipping...');
            await client.query('ROLLBACK');
            return;
        }

        // Create the Welcome Screen module
        const moduleRes = await client.query(
            `INSERT INTO module_templates (name, description, is_active, created_at, updated_at, created_by)
             VALUES ($1, $2, true, NOW(), NOW(), $3)
             RETURNING id`,
            [
                'Welcome Screen',
                'Initial welcome screen with title, message, and start button',
                userId
            ]
        );

        const moduleId = moduleRes.rows[0].id;
        console.log(`✓ Created module: Welcome Screen (${moduleId})`);

        // Define the module structure with components
        const structure = {
            components: [
                {
                    id: 'title',
                    name: 'Title',
                    type: 'text_input',
                    label: 'Title',
                    placeholder: 'Title of the screen',
                    required: false,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'message',
                    name: 'Message',
                    type: 'textarea',
                    label: 'Message',
                    placeholder: 'Message for the screen\' section. Autosize height based on content lines',
                    required: false,
                    order: 2,
                    settings: {
                        maxLength: 100,
                        autosize: true
                    }
                },
                {
                    id: 'start_button_text',
                    name: 'Start button text',
                    type: 'text_input',
                    label: 'Start button text',
                    placeholder: 'Name the button to start the test',
                    required: false,
                    order: 3,
                    settings: {}
                }
            ]
        };

        // Update the module with the structure
        await client.query(
            `UPDATE module_templates SET structure = $1 WHERE id = $2`,
            [JSON.stringify(structure), moduleId]
        );

        console.log('  ✓ Added 3 components:');
        console.log('    - Title (text_input)');
        console.log('    - Message (textarea)');
        console.log('    - Start button text (text_input)');

        await client.query('COMMIT');
        console.log('\n✅ Welcome Screen module created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedWelcomeScreenModule();
