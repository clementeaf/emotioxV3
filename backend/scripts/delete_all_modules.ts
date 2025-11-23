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

async function deleteModules() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Deleting specified module templates...');
        await client.query('BEGIN');

        const modulesToDelete = [
            'Cognitive Value (CV)',
            'Net Emotional Value (NEV)',
            'Customer Effort Score (CES)',
            'CSAT',
            'Welcome Screen'
        ];

        for (const name of modulesToDelete) {
            const res = await client.query('DELETE FROM module_templates WHERE name = $1 RETURNING id', [name]);
            if (res.rowCount && res.rowCount > 0) {
                console.log(`✅ Deleted: ${name}`);
            } else {
                console.log(`⚠️  Not found (or already deleted): ${name}`);
            }
        }

        await client.query('COMMIT');
        console.log('🏁 Deletion complete.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error deleting modules:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

deleteModules();
