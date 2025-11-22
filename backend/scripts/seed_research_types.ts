import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load env vars from root BEFORE importing pool
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const seedResearchTypes = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed...');
        await client.query('BEGIN');

        // Get a user ID (any user) to use as created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0]?.id;

        if (!userId) {
            console.log('No users found. Cannot seed research types without a creator.');
            await client.query('ROLLBACK');
            return;
        }

        const types = [
            'Behavioural Research',
            'Attention\'s Prediction',
            'Insights Finding',
            'Client\'s Benchmark'
        ];

        for (const name of types) {
            // Check if exists
            const check = await client.query('SELECT id FROM research_types WHERE name = $1', [name]);
            if (check.rows.length === 0) {
                await client.query(
                    `INSERT INTO research_types (name, description, is_active, created_at, updated_at, created_by)
                     VALUES ($1, $2, true, NOW(), NOW(), $3)`,
                    [name, `Default type: ${name}`, userId]
                );
                console.log(`Inserted: ${name}`);
            } else {
                console.log(`Skipped (already exists): ${name}`);
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

seedResearchTypes();
