import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function checkModules() {
    try {
        const res = await pool.query('SELECT id, name, description FROM module_templates');
        console.log('Current modules in DB:');
        res.rows.forEach(row => {
            console.log(`- ${row.name} (${row.id})`);
        });
    } catch (err) {
        console.error('Error checking modules:', err);
    } finally {
        await pool.end();
    }
}

checkModules();
