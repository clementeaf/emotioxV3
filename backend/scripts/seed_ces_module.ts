import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function seedCESModule() {
    try {
        console.log('🌱 Seeding CES Module Template...');

        const moduleData = {
            name: 'Customer Effort Score (CES)',
            description: 'Standard metric to measure how much effort a customer had to exert to get an issue resolved.',
            structure: {
                components: [
                    {
                        id: 'ces-question',
                        type: 'input',
                        label: 'Pregunta',
                        defaultValue: '¿Qué tan fácil fue resolver tu problema?',
                        placeholder: {
                            enabled: true,
                            text: 'Escribe la pregunta aquí...'
                        },
                        required: true,
                        order: 1
                    },
                    {
                        id: 'ces-range',
                        type: 'select',
                        label: 'Rango',
                        selectRange: {
                            type: 'predefined',
                            predefined: '1-7'
                        },
                        options: [
                            { value: '1-5', label: '1-5' },
                            { value: '1-7', label: '1-7' },
                            { value: '1-10', label: '1-10' }
                        ],
                        required: true,
                        order: 2
                    }
                ]
            }
        };

        // Check if module already exists
        const checkRes = await pool.query(
            'SELECT id FROM module_templates WHERE name = $1',
            [moduleData.name]
        );

        if (checkRes.rows.length > 0) {
            console.log('⚠️ CES Module already exists. Updating...');
            await pool.query(
                'UPDATE module_templates SET description = $1, structure = $2, updated_at = NOW() WHERE name = $3',
                [moduleData.description, moduleData.structure, moduleData.name]
            );
        } else {
            await pool.query(
                'INSERT INTO module_templates (name, description, structure) VALUES ($1, $2, $3)',
                [moduleData.name, moduleData.description, moduleData.structure]
            );
        }

        console.log('✅ CES Module Template seeded successfully!');
    } catch (error) {
        console.error('❌ Error seeding CES module:', error);
    } finally {
        await pool.end();
    }
}

seedCESModule();
