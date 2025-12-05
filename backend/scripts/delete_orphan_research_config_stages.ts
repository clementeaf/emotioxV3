// Script to delete orphan "Research Configuration" stages from researches
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

async function deleteOrphanStages() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Deleting orphan "Research Configuration" stages from researches...');
        await client.query('BEGIN');

        // Find all stages named "Research Configuration"
        const findRes = await client.query(
            `SELECT s.id, s.name, r.name as research_name, r.id as research_id
             FROM stages s
             JOIN researches r ON s.research_id = r.id
             WHERE s.name = $1`,
            ['Research Configuration']
        );

        if (findRes.rows.length === 0) {
            console.log('✅ No orphan "Research Configuration" stages found.');
            await client.query('COMMIT');
            return;
        }

        console.log(`Found ${findRes.rows.length} orphan stage(s):`);
        findRes.rows.forEach(row => {
            console.log(`  - Stage: "${row.name}" in research "${row.research_name}" (${row.research_id})`);
        });

        // Delete all orphan stages
        const deleteRes = await client.query(
            'DELETE FROM stages WHERE name = $1',
            ['Research Configuration']
        );

        console.log(`\n✅ Deleted ${deleteRes.rowCount} orphan "Research Configuration" stage(s)!`);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error deleting orphan stages:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

deleteOrphanStages();
