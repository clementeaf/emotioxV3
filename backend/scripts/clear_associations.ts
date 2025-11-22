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

const clearAssociations = async () => {
    try {
        console.log('Clearing all research type-technique associations...');

        const result = await pool.query('DELETE FROM research_types_techniques');

        console.log(`✓ Deleted ${result.rowCount} associations`);
        console.log('All research types are now unassociated from techniques.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
};

clearAssociations();
