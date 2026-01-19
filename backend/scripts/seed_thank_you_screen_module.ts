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
 * Crea el template de módulo "Thank You Screen"
 * Consta de un input para "Title" y un textarea para "Message"
 */
const seedThankYouScreenModule = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Starting seed for Thank You Screen module...');
        await connection.beginTransaction();

        // Check if module already exists
        const [checkModuleRows] = await connection.query(
            'SELECT id FROM module_templates WHERE name = ?',
            ['Thank You Screen']
        ) as any[];

        if (checkModuleRows.length > 0) {
            console.log('Thank You Screen module already exists. Skipping...');
            await connection.rollback();
            return;
        }

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

        // Generate UUID for the module
        const moduleId = randomUUID();

        // Create the Thank You Screen module
        await connection.query(
            `INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
            [
                moduleId,
                'Thank You Screen',
                'Completion screen with title and message',
                JSON.stringify(structure)
            ]
        );
        console.log(`✓ Created module: Thank You Screen (${moduleId})`);

        console.log('  ✓ Added 2 components:');
        console.log('    - Title (input)');
        console.log('    - Message (textarea)');

        await connection.commit();
        console.log('\n✅ Thank You Screen module created successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Seed failed:', error);
    } finally {
        connection.release();
        await pool.end();
    }
};

seedThankYouScreenModule();

