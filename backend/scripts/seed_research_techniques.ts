import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load env vars from root BEFORE importing pool
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false
    }
});

const seedResearchTechniques = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed...');
        await client.query('BEGIN');

        // Get a user ID (any user) to use as created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.log('No users found. Cannot seed research techniques without a creator.');
            await client.query('ROLLBACK');
            return;
        }

        const techniques = [
            {
                name: 'Biometric, Cognitive and Predictive',
                description: 'Evaluating one or more section with biometrics, implicit association and cognitive task. Also, you can have image and video predictions'
            },
            {
                name: 'AIM Framework Stage 3',
                description: 'Start with VOC Smart or build an upgrade by your own'
            }
        ];

        for (const technique of techniques) {
            // Check if exists
            const check = await client.query('SELECT id FROM research_techniques WHERE name = $1', [technique.name]);
            if (check.rows.length === 0) {
                await client.query(
                    `INSERT INTO research_techniques (name, description, is_active, created_at, updated_at, created_by)
                     VALUES ($1, $2, true, NOW(), NOW(), $3)`,
                    [technique.name, technique.description, userId]
                );
                console.log(`Inserted: ${technique.name}`);
            } else {
                console.log(`Skipped (already exists): ${technique.name}`);
            }
        }

        await client.query('COMMIT');
        console.log('Seed completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedResearchTechniques();
