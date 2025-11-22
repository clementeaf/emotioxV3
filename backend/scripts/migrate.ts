import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from root BEFORE importing pool
dotenv.config({ path: path.join(__dirname, '../.env') });

import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const runMigration = async () => {
    try {
        const migrationPath = path.join(__dirname, '../database/migrations/007_module_templates.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Running migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
    }
};

runMigration();
