import fs from 'fs';
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

const defaultModules = [
    {
        name: 'Welcome Screen',
        description: 'Introduction to the research',
        order: 1,
        config: {},
        questions: []
    },
    {
        name: 'Smart VOC',
        description: 'Voice of Customer module',
        order: 2,
        config: {},
        questions: []
    },
    {
        name: 'Cognitive Task',
        description: 'Cognitive performance task',
        order: 3,
        config: {},
        questions: []
    },
    {
        name: 'Thank you screen',
        description: 'End of research message',
        order: 4,
        config: {},
        questions: []
    }
];

const seedBehaviouralModules = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting seed for Behavioural Research modules...');
        await client.query('BEGIN');

        // 1. Update Research Type
        const typeName = 'Behavioural Research';
        console.log(`Updating default_modules for ${typeName}...`);

        const updateTypeQuery = `
            UPDATE research_types 
            SET default_modules = $1, updated_at = NOW()
            WHERE name = $2
            RETURNING id
        `;

        const typeResult = await client.query(updateTypeQuery, [JSON.stringify(defaultModules), typeName]);

        if (typeResult.rows.length === 0) {
            console.error(`Research Type "${typeName}" not found!`);
            await client.query('ROLLBACK');
            return;
        }

        const researchTypeId = typeResult.rows[0].id;
        console.log(`Updated Research Type ID: ${researchTypeId}`);

        // 2. Update existing researches of this type
        console.log('Checking existing researches...');

        const researchesQuery = `
            SELECT id, name FROM researches 
            WHERE research_type_id = $1 AND deleted_at IS NULL
        `;

        const researchesResult = await client.query(researchesQuery, [researchTypeId]);

        for (const research of researchesResult.rows) {
            console.log(`Processing research: ${research.name} (${research.id})`);

            for (const module of defaultModules) {
                // Check if module already exists
                const checkModuleQuery = `
                    SELECT id FROM modules 
                    WHERE research_id = $1 AND name = $2
                `;
                const checkResult = await client.query(checkModuleQuery, [research.id, module.name]);

                if (checkResult.rows.length === 0) {
                    console.log(`  Adding module: ${module.name}`);
                    const insertModuleQuery = `
                        INSERT INTO modules (research_id, name, description, order_index, is_from_template, config)
                        VALUES ($1, $2, $3, $4, true, $5)
                    `;
                    await client.query(insertModuleQuery, [
                        research.id,
                        module.name,
                        module.description,
                        module.order,
                        JSON.stringify(module.config)
                    ]);
                } else {
                    console.log(`  Module already exists: ${module.name}`);
                }
            }
        }

        await client.query('COMMIT');
        console.log('Seed completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Seed failed:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

seedBehaviouralModules();
