// Run migration to create stage_templates tables
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🔧 Running stage_templates migration...');

        const migrationSQL = fs.readFileSync(
            path.resolve(__dirname, '../migrations/009_create_stage_templates.sql'),
            'utf-8'
        );

        await client.query(migrationSQL);

        console.log('✅ Migration completed successfully!');
    } catch (err) {
        console.error('❌ Error running migration:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
