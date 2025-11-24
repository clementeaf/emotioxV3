import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load env vars from root BEFORE importing pool
dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const linkBehaviouralTechniques = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting to link techniques to Behavioural Research...');
        await client.query('BEGIN');

        // Get the Behavioural Research type ID
        const typeRes = await client.query(
            'SELECT id FROM research_types WHERE name = $1',
            ['Behavioural Research']
        );

        if (typeRes.rows.length === 0) {
            console.log('❌ Behavioural Research type not found. Please run seed_research_types.ts first.');
            await client.query('ROLLBACK');
            return;
        }

        const researchTypeId = typeRes.rows[0].id;
        console.log(`✓ Found Behavioural Research with ID: ${researchTypeId}`);

        // Get the technique IDs
        const techniques = [
            'Biometric, Cognitive and Predictive',
            'AIM Framework Stage 3'
        ];

        for (const techniqueName of techniques) {
            const techRes = await client.query(
                'SELECT id FROM research_techniques WHERE name = $1',
                [techniqueName]
            );

            if (techRes.rows.length === 0) {
                console.log(`⚠️  Technique "${techniqueName}" not found. Skipping...`);
                continue;
            }

            const techniqueId = techRes.rows[0].id;

            // Check if relationship already exists
            const checkRes = await client.query(
                'SELECT * FROM research_types_techniques WHERE research_type_id = $1 AND research_technique_id = $2',
                [researchTypeId, techniqueId]
            );

            if (checkRes.rows.length > 0) {
                console.log(`⚠️  Relationship already exists for "${techniqueName}". Skipping...`);
                continue;
            }

            // Insert the relationship
            await client.query(
                `INSERT INTO research_types_techniques (research_type_id, research_technique_id)
                 VALUES ($1, $2)`,
                [researchTypeId, techniqueId]
            );

            console.log(`✓ Linked "${techniqueName}" to Behavioural Research`);
        }

        await client.query('COMMIT');
        console.log('\n✅ All techniques linked successfully!');

        // Show final relationships
        const finalRes = await client.query(`
            SELECT rt.name as technique_name
            FROM research_techniques rt
            INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
            WHERE rtt.research_type_id = $1
            ORDER BY rt.name
        `, [researchTypeId]);

        console.log('\nCurrent techniques for Behavioural Research:');
        finalRes.rows.forEach((row, index) => {
            console.log(`  ${index + 1}. ${row.technique_name}`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to link techniques:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

linkBehaviouralTechniques();
