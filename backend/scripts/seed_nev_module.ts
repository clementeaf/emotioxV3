import { createPool, Pool } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: 10,
});

async function seedNEVModule() {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Seeding NEV Module Template...');
        await connection.beginTransaction();

        const moduleData = {
            name: 'Net Emotional Value (NEV)',
            description: 'Measure the net emotional value of the customer experience.',
            structure: {
                components: [
                    {
                        id: 'nev-title',
                        type: 'input',
                        label: 'Question',
                        placeholder: {
                            enabled: true,
                            text: 'Type your question here...'
                        },
                        required: true,
                        order: 1
                    },
                    {
                        id: 'nev-description',
                        type: 'textarea',
                        label: 'Description (optional)',
                        placeholder: {
                            enabled: true,
                            text: 'Enter an optional description...'
                        },
                        required: false,
                        order: 2
                    },
                    {
                        id: 'nev-instructions',
                        type: 'textarea',
                        label: 'Instructions (optional)',
                        placeholder: {
                            enabled: true,
                            text: 'Enter optional instructions...'
                        },
                        required: false,
                        order: 3
                    }
                ]
            }
        };

        // Check if module already exists
        const [checkRows] = await connection.query(
            'SELECT id FROM module_templates WHERE name = ?',
            [moduleData.name]
        ) as any[];

        if (checkRows.length > 0) {
            console.log('⚠️ NEV Module already exists. Updating...');
            await connection.query(
                'UPDATE module_templates SET description = ?, structure = ?, updated_at = NOW() WHERE name = ?',
                [moduleData.description, JSON.stringify(moduleData.structure), moduleData.name]
            );
        } else {
            await connection.query(
                'INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at) VALUES (UUID(), ?, ?, ?, true, NOW(), NOW())',
                [moduleData.name, moduleData.description, JSON.stringify(moduleData.structure)]
            );
        }

        await connection.commit();
        console.log('✅ NEV Module Template seeded successfully!');
    } catch (err) {
        await connection.rollback();
        console.error('Error seeding NEV module:', err);
    } finally {
        connection.release();
        await pool.end();
    }
}

seedNEVModule();
