import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const seedCSATModule = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed for CSAT module...');
        await client.query('BEGIN');

        // Get a user ID to use as created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.log('No users found. Cannot seed module without a creator.');
            await client.query('ROLLBACK');
            return;
        }

        // Check if module already exists
        const checkModule = await client.query(
            'SELECT id FROM module_templates WHERE name = $1',
            ['Customer Satisfaction Score (CSAT)']
        );

        let moduleId: string;

        if (checkModule.rows.length > 0) {
            console.log('CSAT module already exists. Updating...');
            moduleId = checkModule.rows[0].id;
            await client.query(
                `UPDATE module_templates 
                 SET description = $1, updated_at = NOW() 
                 WHERE id = $2`,
                [
                    'Customer Satisfaction Score - Rate satisfaction level with stars or numbers (1-5)',
                    moduleId
                ]
            );
            console.log(`✓ Updated module: CSAT (${moduleId})`);
        } else {
            // Create the CSAT module
            const moduleRes = await client.query(
                `INSERT INTO module_templates (name, description, is_active, created_at, updated_at, created_by)
                 VALUES ($1, $2, true, NOW(), NOW(), $3)
                 RETURNING id`,
                [
                    'Customer Satisfaction Score (CSAT)',
                    'Customer Satisfaction Score - Rate satisfaction level with stars or numbers (1-5)',
                    userId
                ]
            );

            moduleId = moduleRes.rows[0].id;
            console.log(`✓ Created module: CSAT (${moduleId})`);
        }

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

        // Update the module with the structure
        await client.query(
            `UPDATE module_templates SET structure = $1 WHERE id = $2`,
            [JSON.stringify(structure), moduleId]
        );

        console.log('  ✓ Added 4 components:');
        console.log('    - Título de la pregunta (input)');
        console.log('    - Descripción (textarea, opcional)');
        console.log('    - Instrucciones (textarea, opcional)');
        console.log('    - Tipo de visualización (select: Estrellas/Números)');

        await client.query('COMMIT');
        console.log('\n✅ CSAT module created successfully!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedCSATModule();
