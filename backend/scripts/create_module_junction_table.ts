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

const createJunctionTable = async () => {
    try {
        console.log('Creating research_types_module_templates junction table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS research_types_module_templates (
                research_type_id UUID NOT NULL REFERENCES research_types(id) ON DELETE CASCADE,
                module_template_id UUID NOT NULL REFERENCES module_templates(id) ON DELETE CASCADE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                PRIMARY KEY (research_type_id, module_template_id)
            );
        `);

        console.log('✓ Table created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_research_types_modules_type_id 
                ON research_types_module_templates(research_type_id);
        `);

        console.log('✓ Index on research_type_id created');

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_research_types_modules_template_id 
                ON research_types_module_templates(module_template_id);
        `);

        console.log('✓ Index on module_template_id created');
        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await pool.end();
    }
};

createJunctionTable();
