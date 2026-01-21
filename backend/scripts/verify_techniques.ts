import path from 'path';
import dotenv from 'dotenv';
import { createPool, type Pool } from 'mysql2/promise';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool: Pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

const verifyTechniques = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        const researchTypeId = '3bbdfaa8-f4b5-11f0-89bb-0200fd8285c9';
        
        console.log('Verifying techniques for research type:', researchTypeId);
        console.log('');
        
        // Check if research type exists
        const [typeRows] = await connection.query<Array<{ id: string; name: string }>>(
            'SELECT id, name FROM research_types WHERE id = ?',
            [researchTypeId]
        );
        
        if (typeRows.length === 0) {
            console.log('❌ Research type not found!');
            return;
        }
        
        console.log('✓ Research type found:', typeRows[0].name);
        console.log('');
        
        // Get techniques
        const [techRows] = await connection.query<Array<{ id: string; name: string; description: string }>>(
            `SELECT rt.id, rt.name, rt.description
             FROM research_techniques rt
             INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
             WHERE rtt.research_type_id = ?
             ORDER BY rt.name`,
            [researchTypeId]
        );
        
        console.log(`✓ Found ${techRows.length} techniques:`);
        techRows.forEach((tech, index) => {
            console.log(`  ${index + 1}. ${tech.name} (${tech.id})`);
        });
        
        if (techRows.length === 0) {
            console.log('');
            console.log('❌ No techniques found for this research type!');
            console.log('   This is the problem - the endpoint will return an empty array.');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        connection.release();
        await pool.end();
    }
};

verifyTechniques().catch(console.error);
