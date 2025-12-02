// Seed script to insert VOC (Voice of Costumer) module template into the database
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

async function seedVOCModule() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding VOC Module Template...');
        await client.query('BEGIN');

        const moduleData = {
            name: 'Voice of Costumer (VOC)',
            description: 'Capture detailed qualitative feedback from customers.',
            structure: {
                components: [
                    {
                        id: 'voc-title',
                        type: 'input',
                        label: 'Título de la pregunta',
                        placeholder: {
                            enabled: true,
                            text: 'Introduzca el título de la pregunta'
                        },
                        required: true,
                        order: 1
                    },
                    {
                        id: 'voc-description',
                        type: 'textarea',
                        label: 'Descripción (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Introduzca una descripción opcional para la pregunta'
                        },
                        required: false,
                        order: 2
                    },
                    {
                        id: 'voc-instructions',
                        type: 'textarea',
                        label: 'Instrucciones (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Añada instrucciones o información adicional para los participantes'
                        },
                        required: false,
                        order: 3
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
            console.log('⚠️ VOC Module already exists. Updating...');
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
        console.log('✅ VOC Module Template seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding VOC module:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedVOCModule();
