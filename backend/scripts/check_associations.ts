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

const checkAssociations = async () => {
    try {
        console.log('\n=== RESEARCH TECHNIQUES ===');
        const techniquesRes = await pool.query(
            'SELECT id, name, description FROM research_techniques WHERE is_active = true ORDER BY name'
        );
        console.table(techniquesRes.rows);

        console.log('\n=== RESEARCH TYPES ===');
        const typesRes = await pool.query(
            'SELECT id, name FROM research_types WHERE is_active = true ORDER BY name'
        );
        console.table(typesRes.rows);

        console.log('\n=== ASSOCIATIONS (research_types_techniques) ===');
        const associationsRes = await pool.query(`
            SELECT 
                rt.name as research_type, 
                rtech.name as technique
            FROM research_types rt
            INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_type_id
            INNER JOIN research_techniques rtech ON rtt.research_technique_id = rtech.id
            WHERE rt.is_active = true
            ORDER BY rt.name, rtech.name
        `);

        if (associationsRes.rows.length === 0) {
            console.log('No associations found.');
        } else {
            console.table(associationsRes.rows);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
};

checkAssociations();
