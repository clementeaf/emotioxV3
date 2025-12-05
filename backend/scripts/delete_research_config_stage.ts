// Script to delete the "Research Configuration" stage template
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

async function deleteResearchConfigStage() {
    const client = await pool.connect();
    try {
        console.log('🗑️  Deleting "Research Configuration" stage template...');
        await client.query('BEGIN');

        // Check if it exists
        const checkRes = await client.query(
            'SELECT id, name FROM stage_templates WHERE name = $1',
            ['Research Configuration']
        );

        if (checkRes.rows.length === 0) {
            console.log('⚠️  Stage template "Research Configuration" not found.');
            return;
        }

        const stageId = checkRes.rows[0].id;
        console.log(`Found stage template: ${checkRes.rows[0].name} (${stageId})`);

        // Delete the stage template (CASCADE will delete associations)
        const deleteRes = await client.query(
            'DELETE FROM stage_templates WHERE id = $1',
            [stageId]
        );

        await client.query('COMMIT');
        console.log('✅ "Research Configuration" stage template deleted successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error deleting stage template:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

deleteResearchConfigStage();
