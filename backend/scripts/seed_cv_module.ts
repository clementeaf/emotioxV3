// Seed script to insert CV (Cognitive Value) module template into the database
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

async function seedCVModule() {
    const connection = await pool.getConnection();
    try {
        console.log('🌱 Seeding CV Module Template...');
        await connection.beginTransaction();

        const moduleData = {
            name: 'Cognitive Value (CV)',
            description: 'CV module with custom range and labels',
            structure: {
                components: [
                    {
                        id: 'cv-title',
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
                        id: 'cv-description',
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
                        id: 'cv-instructions',
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
                        id: 'cv-scale-range',
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
                        id: 'cv-start-label',
                        type: 'input',
                        label: 'Etiqueta inicial (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: No en absoluto'
                        },
                        required: false,
                        order: 5
                    },
                    {
                        id: 'cv-end-label',
                        type: 'input',
                        label: 'Etiqueta final (opcional)',
                        placeholder: {
                            enabled: true,
                            text: 'Ej: Totalmente'
                        },
                        required: false,
                        order: 6
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
            console.log('⚠️ CV Module already exists. Updating...');
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
        console.log('✅ CV Module Template seeded successfully!');
    } catch (err) {
        await connection.rollback();
        console.error('Error seeding CV module:', err);
    } finally {
        connection.release();
        await pool.end();
    }
}

seedCVModule();
