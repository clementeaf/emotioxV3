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
            ['CSAT']
        );

        if (checkModule.rows.length > 0) {
            console.log('CSAT module already exists. Skipping...');
            await client.query('ROLLBACK');
            return;
        }

        // Create the CSAT module
        const moduleRes = await client.query(
            `INSERT INTO module_templates (name, description, is_active, created_at, updated_at, created_by)
             VALUES ($1, $2, true, NOW(), NOW(), $3)
             RETURNING id`,
            [
                'CSAT',
                'Customer Satisfaction Score - Rate satisfaction level with stars or numbers (1-5)',
                userId
            ]
        );

        const moduleId = moduleRes.rows[0].id;
        console.log(`✓ Created module: CSAT (${moduleId})`);

        // Define the module structure with components
        const structure = {
            components: [
                {
                    id: 'question',
                    name: 'Question',
                    type: 'text_input',
                    label: 'Question',
                    placeholder: 'How would you rate your overall satisfaction level with [company]?',
                    required: false,
                    order: 1,
                    settings: {}
                },
                {
                    id: 'rating_type',
                    name: 'Rating Type',
                    type: 'select',
                    label: 'Rating Type',
                    placeholder: 'Select rating type',
                    required: false,
                    order: 2,
                    settings: {
                        options: [
                            { value: 'csat', label: 'CSAT (1-5 Numbers)' },
                            { value: 'stars', label: 'Stars (⭐⭐⭐⭐⭐)' }
                        ],
                        defaultValue: 'stars'
                    }
                }
            ]
        };

        // Update the module with the structure
        await client.query(
            `UPDATE module_templates SET structure = $1 WHERE id = $2`,
            [JSON.stringify(structure), moduleId]
        );

        console.log('  ✓ Added 2 components:');
        console.log('    - Question (text_input)');
        console.log('    - Rating Type (select: CSAT or Stars)');

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
