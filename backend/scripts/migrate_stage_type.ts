import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { readFileSync } from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const migrateStageType = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration for stage_type...');
        await client.query('BEGIN');

        // Read migration file
        const migrationPath = path.join(__dirname, '../migrations/010_add_stage_type.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        // Execute migration
        await client.query(migrationSQL);

        await client.query('COMMIT');
        console.log('✅ Migration completed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
};

migrateStageType();

