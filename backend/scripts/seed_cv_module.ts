// Seed script to insert CV (Cognitive Value) module template into the database
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function seedCVModule() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding CV Module Template...');

        const moduleData = {
            name: 'Cognitive Value (CV)',
            description: 'CV module with custom range and labels',
            structure: {
                components: [
                    {
                        id: 'cv-question',
                        type: 'input',
                        label: 'Pregunta',
                        defaultValue: '¿Qué valor le das a este producto?',
                        placeholder: {
                            enabled: true,
                            text: 'Escribe la pregunta aquí...'
                        },
                        required: true,
                        order: 1
                    },
                    {
                        id: 'cv-range-min',
                        type: 'input',
                        label: 'Número de inicio del rango',
                        defaultValue: '1',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: 1'
                        },
                        required: true,
                        order: 2
                    },
                    {
                        id: 'cv-range-max',
                        type: 'input',
                        label: 'Número final del rango',
                        defaultValue: '5',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: 5'
                        },
                        required: true,
                        order: 3
                    },
                    {
                        id: 'cv-start-label',
                        type: 'input',
                        label: 'Label para inicio del rango',
                        defaultValue: 'Worthless',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: Worthless, Malo'
                        },
                        required: true,
                        order: 4
                    },
                    {
                        id: 'cv-end-label',
                        type: 'input',
                        label: 'Label para final del rango',
                        defaultValue: 'Worth',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: Worth, Excelente'
                        },
                        required: true,
                        order: 5
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
            console.log('⚠️ CV Module already exists. Updating...');
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
        console.log('✅ CV Module Template seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding CV module:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedCVModule();
