// Seed script to insert NPS (Net Promoter Score) module template into the database
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

async function seedNPSModule() {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Seeding NPS Module Template...');
        await connection.beginTransaction();

        const moduleData = {
            name: 'Net Promoter Score (NPS)',
            description: 'Measure customer loyalty and satisfaction.',
            structure: {
                components: [
                    {
                        id: 'nps-title',
                        type: 'input',
                        label: 'Question',
                        placeholder: {
                            enabled: true,
                            text: 'En una escala del 0 al 10, ¿qué tan probable es que recomiendes [nuestra empresa/producto/servicio] a un amigo o familiar?'
                        },
                        required: true,
                        order: 1
                    },
                    {
                        id: 'nps-description',
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
                        id: 'nps-instructions',
                        type: 'textarea',
                        label: 'Instructions (optional)',
                        placeholder: {
                            enabled: true,
                            text: 'Add instructions...'
                        },
                        required: false,
                        order: 3
                    },
                    {
                        id: 'nps-scale-range',
                        type: 'input',
                        label: 'Range',
                        placeholder: {
                            enabled: false
                        },
                        required: false,
                        order: 4,
                        settings: {
                            readonly: true,
                            defaultValue: '0-10'
                        }
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
            console.log('⚠️ NPS Module already exists. Updating...');
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
        console.log('✅ NPS Module Template seeded successfully!');
    } catch (err) {
        await connection.rollback();
        console.error('Error seeding NPS module:', err);
    } finally {
        connection.release();
        await pool.end();
    }
}

seedNPSModule();
