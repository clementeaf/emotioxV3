/**
 * Seed script to create an initial user if none exists
 */

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

const seedInitialUser = async () => {
    const client = await pool.connect();
    try {
        console.log('🌱 Checking for existing users...');
        await client.query('BEGIN');

        const userRes = await client.query('SELECT id FROM users LIMIT 1');

        if (userRes.rows.length > 0) {
            console.log('✓ Users already exist. Skipping initial user creation.');
            await client.query('ROLLBACK');
            return;
        }

        console.log('No users found. Creating initial admin user...');

        // Create a default user
        // Adjust fields based on your schema. Assuming common fields: email, password, name, role
        // You might need to check schema first if uncertain, but common pattern:

        // Generate a fake Cognito Sub (UUID)
        const cognitoSub = '00000000-0000-0000-0000-000000000000';

        const insertRes = await client.query(
            `INSERT INTO users (email, cognito_sub, first_name, last_name, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id, email`,
            ['admin@emotiox.com', cognitoSub, 'Admin', 'User', 'admin']
        );

        console.log(`✓ Created user: ${insertRes.rows[0].email} (ID: ${insertRes.rows[0].id})`);

        await client.query('COMMIT');
        console.log('✅ Initial user seed completed!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ User seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedInitialUser();
