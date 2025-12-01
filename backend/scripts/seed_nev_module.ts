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

async function seedNEVModule() {
    const client = await pool.connect();
    try {
        console.log('🌱 Seeding NEV Module Template...');
        await client.query('BEGIN');

        const moduleData = {
            name: 'Net Emotional Value (NEV)',
            description: 'Measure the net emotional value of the customer experience.',
            structure: {
                components: [
                    {
                        id: 'nev-question',
                        type: 'input',
                        label: 'Título de pregunta',
                        placeholder: {
                            enabled: true,
                            text: 'Escribe el título de la pregunta aquí...'
                        },
                        required: true,
                        order: 1
                    },
                    {
                        id: 'nev-emotions-range',
                        type: 'select',
                        label: 'Rango de emociones',
                        selectRange: {
                            type: 'custom',
                            custom: { min: 1, max: 20 }
                        },
                        options: Array.from({ length: 20 }, (_, i) => ({
                            value: (i + 1).toString(),
                            label: `${i + 1}`
                        })),
                        required: true,
                        order: 2
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
            console.log('⚠️ NEV Module already exists. Updating...');
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
        console.log('✅ NEV Module Template seeded successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error seeding NEV module:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedNEVModule();
