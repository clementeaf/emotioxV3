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

const seedWelcomeScreenModule = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Starting seed for Welcome Screen module...');
        await connection.beginTransaction();

        // Get a user ID to use as created_by
        const [userRows] = await connection.query('SELECT id FROM users LIMIT 1') as any[];
        const userId = userRows[0]?.id;

        if (!userId) {
            console.log('No users found. Cannot seed module without a creator.');
            await connection.rollback();
            return;
        }

        // Check if module already exists
        const [checkRows] = await connection.query(
            'SELECT id FROM module_templates WHERE name = ?',
            ['Welcome Screen']
        ) as any[];

        if (checkRows.length > 0) {
            console.log('Welcome Screen module already exists. Skipping...');
            await connection.rollback();
            return;
        }

        // Generate UUID for the module
        const moduleId = randomUUID();

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
                },
                {
                    id: 'start_button_text',
                    name: 'Start button text',
                    type: 'input',
                    label: 'Start button text',
                    defaultValue: '',
                    placeholder: {
                        enabled: true,
                        text: 'Name the button to start the test'
                    },
                    required: false,
                    order: 3,
                    settings: {}
                }
            ]
        };

        // Create the Welcome Screen module
        await connection.query(
            `INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
            [
                moduleId,
                'Welcome Screen',
                'Initial welcome screen with title, message, and start button',
                JSON.stringify(structure)
            ]
        );
        console.log(`✓ Created module: Welcome Screen (${moduleId})`);

        console.log('  ✓ Added 3 components:');
        console.log('    - Title (text_input)');
        console.log('    - Message (textarea)');
        console.log('    - Start button text (text_input)');

        await connection.commit();
        console.log('\n✅ Welcome Screen module created successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Seed failed:', error);
    } finally {
        connection.release();
        await pool.end();
    }
};

seedWelcomeScreenModule();
