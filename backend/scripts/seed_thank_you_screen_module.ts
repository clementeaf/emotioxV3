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

/**
 * Crea el template de módulo "Thank You Screen"
 * Consta de un input para "Title" y un textarea para "Message"
 */
const seedThankYouScreenModule = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed for Thank You Screen module...');
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
            ['Thank You Screen']
        );

        if (checkModule.rows.length > 0) {
            console.log('Thank You Screen module already exists. Skipping...');
            await client.query('ROLLBACK');
            return;
        }

        // Create the Thank You Screen module
        const moduleRes = await client.query(
            `INSERT INTO module_templates (name, description, is_active, created_at, updated_at, created_by)
             VALUES ($1, $2, true, NOW(), NOW(), $3)
             RETURNING id`,
            [
                'Thank You Screen',
                'Completion screen with title and message',
                userId
            ]
        );

        const moduleId = moduleRes.rows[0].id;
        console.log(`✓ Created module: Thank You Screen (${moduleId})`);

        // Define the module structure with components
        const structure = {
            components: [
                {
                    id: 'title',
                    name: 'Title',
                    type: 'input',
                    label: 'Title',
                    defaultValue: '',
                    placeholder: {
                        enabled: true,
                        text: 'Title of the screen'
                    },
                    required: false,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'message',
                    name: 'Message',
                    type: 'textarea',
                    label: 'Message',
                    defaultValue: '',
                    placeholder: {
                        enabled: true,
                        text: 'Message for the screen'
                    },
                    required: false,
                    order: 2,
                    settings: {
                        maxLength: 100,
                        autosize: true
                    }
                }
            ]
        };

        // Update the module with the structure
        await client.query(
            `UPDATE module_templates SET structure = $1 WHERE id = $2`,
            [JSON.stringify(structure), moduleId]
        );

        console.log('  ✓ Added 2 components:');
        console.log('    - Title (input)');
        console.log('    - Message (textarea)');

        await client.query('COMMIT');
        console.log('\n✅ Thank You Screen module created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedThankYouScreenModule();

