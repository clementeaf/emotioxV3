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

const seedCSATModule = async () => {
    const connection = await pool.getConnection();
    try {
        console.log('Starting seed for CSAT module...');
        await connection.beginTransaction();

        // Define the module structure with components
        // Based on frontend/src/components/research/SmartVOC/config.ts
        const structure = {
            components: [
                {
                    id: 'csat-title',
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
                    id: 'csat-description',
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
                    id: 'csat-instructions',
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
                    id: 'csat-display-type',
                    type: 'select',
                    label: 'Tipo de visualización',
                    options: [
                        { value: 'stars', label: 'Estrellas' },
                        { value: 'numbers', label: 'Números' }
                    ],
                    required: true,
                    order: 4
                }
            ]
        };

        // Check if module already exists
        const [checkModuleRows] = await connection.query(
            'SELECT id FROM module_templates WHERE name = ?',
            ['Customer Satisfaction Score (CSAT)']
        ) as any[];

        let moduleId: string;

        if (checkModuleRows.length > 0) {
            console.log('CSAT module already exists. Updating...');
            moduleId = checkModuleRows[0].id;
            await connection.query(
                `UPDATE module_templates 
                 SET description = ?, structure = ?, updated_at = NOW() 
                 WHERE id = ?`,
                [
                    'Customer Satisfaction Score - Rate satisfaction level with stars or numbers (1-5)',
                    JSON.stringify(structure),
                    moduleId
                ]
            );
            console.log(`✓ Updated module: CSAT (${moduleId})`);
        } else {
            // Create the CSAT module
            moduleId = randomUUID();
            await connection.query(
                `INSERT INTO module_templates (id, name, description, structure, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, true, NOW(), NOW())`,
                [
                    moduleId,
                    'Customer Satisfaction Score (CSAT)',
                    'Customer Satisfaction Score - Rate satisfaction level with stars or numbers (1-5)',
                    JSON.stringify(structure)
                ]
            );

            console.log(`✓ Created module: CSAT (${moduleId})`);
        }

        console.log('  ✓ Added 4 components:');
        console.log('    - Título de la pregunta (input)');
        console.log('    - Descripción (textarea, opcional)');
        console.log('    - Instrucciones (textarea, opcional)');
        console.log('    - Tipo de visualización (select: Estrellas/Números)');

        await connection.commit();
        console.log('\n✅ CSAT module created successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Seed failed:', error);
    } finally {
        connection.release();
        await pool.end();
    }
};

seedCSATModule();
