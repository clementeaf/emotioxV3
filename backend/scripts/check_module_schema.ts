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

const checkSchema = async () => {
    try {
        console.log('\n=== TABLES RELATED TO MODULES ===');
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%module%'
            ORDER BY table_name
        `);
        console.table(tablesRes.rows);

        if (tablesRes.rows.length > 0) {
            for (const row of tablesRes.rows) {
                console.log(`\n=== COLUMNS FOR ${row.table_name} ===`);
                const columnsRes = await pool.query(`
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [row.table_name]);
                console.table(columnsRes.rows);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
};

checkSchema();
