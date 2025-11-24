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

(async () => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const stageTemplateRes = await client.query(
            'SELECT id FROM stage_templates WHERE name = $1 AND is_active = true',
            ['Cognitive Tasks']
        );
        
        if (stageTemplateRes.rows.length === 0) {
            console.log('Cognitive Tasks stage template not found.');
            await client.query('ROLLBACK');
            return;
        }
        
        const stageTemplateId = stageTemplateRes.rows[0].id;
        
        // Update 3.1 to have order 0
        await client.query(
            `UPDATE stage_templates_module_templates 
             SET display_order = 0 
             WHERE stage_template_id = $1 
             AND module_template_id = (SELECT id FROM module_templates WHERE name = '3.1')`,
            [stageTemplateId]
        );
        
        // Update 3.2 to have order 1
        await client.query(
            `UPDATE stage_templates_module_templates 
             SET display_order = 1 
             WHERE stage_template_id = $1 
             AND module_template_id = (SELECT id FROM module_templates WHERE name = '3.2')`,
            [stageTemplateId]
        );
        
        await client.query('COMMIT');
        console.log('✓ Updated Cognitive Tasks module orders:');
        console.log('  - 3.1: order 0');
        console.log('  - 3.2: order 1');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
})();

