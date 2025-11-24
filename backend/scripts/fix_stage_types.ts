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

const fixStageTypes = async () => {
    const client = await pool.connect();
    try {
        console.log('🔧 Fixing stage_type for Welcome Screen and Thank You Screen...');
        await client.query('BEGIN');

        // Update stage templates
        const templateResult = await client.query(
            `UPDATE stage_templates 
             SET stage_type = 'single_module', updated_at = NOW()
             WHERE name IN ('Welcome Screen', 'Thank You Screen') 
             AND stage_type = 'module_collection'
             RETURNING name, stage_type`
        );
        console.log(`✓ Updated ${templateResult.rowCount} stage template(s)`);

        // Update existing stages in researches
        const stagesResult = await client.query(
            `UPDATE stages 
             SET stage_type = 'single_module', updated_at = NOW()
             WHERE name IN ('Welcome Screen', 'Thank You Screen') 
             AND stage_type = 'module_collection'
             RETURNING id, name, stage_type`
        );
        console.log(`✓ Updated ${stagesResult.rowCount} stage(s) in researches`);

        // Verify the changes
        const verifyTemplates = await client.query(
            `SELECT name, stage_type FROM stage_templates WHERE name IN ('Welcome Screen', 'Thank You Screen')`
        );
        console.log('\n📋 Stage Templates:');
        verifyTemplates.rows.forEach(row => {
            console.log(`  - ${row.name}: ${row.stage_type}`);
        });

        const verifyStages = await client.query(
            `SELECT name, stage_type, COUNT(*) as count 
             FROM stages 
             WHERE name IN ('Welcome Screen', 'Thank You Screen')
             GROUP BY name, stage_type`
        );
        console.log('\n📋 Stages in Researches:');
        verifyStages.rows.forEach(row => {
            console.log(`  - ${row.name}: ${row.stage_type} (${row.count} stage(s))`);
        });

        await client.query('COMMIT');
        console.log('\n✅ Stage types fixed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing stage types:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

fixStageTypes();

