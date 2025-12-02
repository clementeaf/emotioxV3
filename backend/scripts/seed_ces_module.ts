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
                        id: 'ces-title',
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
                        id: 'ces-description',
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
                        id: 'ces-instructions',
                        type: 'textarea',
                        label: 'Instrucciones (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Añada instrucciones o información adicional para los participantes'
                        },
                        required: false,
                        order: 3
                    },
                    {
                        id: 'ces-scale-range',
                        type: 'select',
                        label: 'Escala',
                        options: [
                            { value: '1-5', label: '1-5' },
                            { value: '1-7', label: '1-7' },
                            { value: '1-10', label: '1-10' }
                        ],
                        required: true,
                        order: 4
                    },
                    {
                        id: 'ces-start-label',
                        type: 'input',
                        label: 'Etiqueta inicial (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: Muy difícil'
                        },
                        required: false,
                        order: 5
                    },
                    {
                        id: 'ces-end-label',
                        type: 'input',
                        label: 'Etiqueta final (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: Muy fácil'
                        },
                        required: false,
                        order: 6
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
