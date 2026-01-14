// Seed script to insert NPS (Net Promoter Score) module template into the database
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

async function seedNPSModule() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding NPS Module Template...');
        await client.query('BEGIN');

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
        const checkRes = await client.query(
            'SELECT id FROM module_templates WHERE name = $1',
            [moduleData.name]
        );

        if ((checkRes.rowCount ?? 0) > 0) {
            console.log('⚠️ NPS Module already exists. Updating...');
            await client.query(
                'UPDATE module_templates SET description = $1, structure = $2, updated_at = NOW() WHERE name = $3',
                [moduleData.description, JSON.stringify(moduleData.structure), moduleData.name]
            );
        } else {
            await client.query(
                'INSERT INTO module_templates (name, description, structure) VALUES ($1, $2, $3)',
                [moduleData.name, moduleData.description, JSON.stringify(moduleData.structure)]
            );
        }

        await client.query('COMMIT');
        console.log('✅ NPS Module Template seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding NPS module:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedNPSModule();
