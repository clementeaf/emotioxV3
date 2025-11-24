import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const migrateStages = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration for Stages hierarchy...');
        await client.query('BEGIN');

        // 1. Create stages table
        console.log('Creating stages table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS stages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                research_id UUID NOT NULL REFERENCES researches(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        // 2. Add stage_id to modules table
        console.log('Adding stage_id to modules table...');
        await client.query(`
            ALTER TABLE modules 
            ADD COLUMN IF NOT EXISTS stage_id UUID REFERENCES stages(id) ON DELETE CASCADE;
        `);

        // 3. Migrate existing modules to a default stage
        console.log('Migrating existing modules...');
        const researchesRes = await client.query('SELECT id FROM researches WHERE deleted_at IS NULL');

        for (const research of researchesRes.rows) {
            const modulesRes = await client.query('SELECT id FROM modules WHERE research_id = $1 AND stage_id IS NULL', [research.id]);

            if (modulesRes.rows.length > 0) {
                console.log(`Creating default stage for research ${research.id}...`);
                const stageRes = await client.query(`
                    INSERT INTO stages (research_id, name, description, order_index)
                    VALUES ($1, 'Initial Stage', 'Automatically created during migration', 1)
                    RETURNING id
                `, [research.id]);

                const stageId = stageRes.rows[0].id;

                await client.query(`
                    UPDATE modules 
                    SET stage_id = $1 
                    WHERE research_id = $2 AND stage_id IS NULL
                `, [stageId, research.id]);
            }
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

migrateStages();
