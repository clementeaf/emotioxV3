import path from 'path';
import dotenv from 'dotenv';
import { createPool, type Pool } from 'mysql2/promise';

// Load env vars from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool: Pool = createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

/**
 * Links all research techniques to all research types
 * This creates the many-to-many relationships in research_types_techniques table
 */
const linkTechniquesToAllTypes = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        console.log('Starting to link techniques to all research types...');
        await connection.beginTransaction();

        // Check if is_active column exists in research_types
        const [typeColumns] = await connection.query<Array<{ COLUMN_NAME: string }>>(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'research_types' 
             AND COLUMN_NAME = 'is_active'`
        );
        const hasTypeIsActive = typeColumns.length > 0;

        // Get all research types (with or without is_active filter)
        const typeQuery = hasTypeIsActive 
            ? 'SELECT id, name FROM research_types WHERE is_active = true'
            : 'SELECT id, name FROM research_types';
        const [typeRows] = await connection.query<Array<{ id: string; name: string }>>(typeQuery);

        if (typeRows.length === 0) {
            console.log('❌ No research types found. Please run seed_research_types_mysql.ts first.');
            await connection.rollback();
            return;
        }

        console.log(`✓ Found ${typeRows.length} research types`);

        // Check if is_active column exists in research_techniques
        const [techColumns] = await connection.query<Array<{ COLUMN_NAME: string }>>(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'research_techniques' 
             AND COLUMN_NAME = 'is_active'`
        );
        const hasTechIsActive = techColumns.length > 0;

        // Get all research techniques (with or without is_active filter)
        const techQuery = hasTechIsActive
            ? 'SELECT id, name FROM research_techniques WHERE is_active = true'
            : 'SELECT id, name FROM research_techniques';
        const [techniqueRows] = await connection.query<Array<{ id: string; name: string }>>(techQuery);

        if (techniqueRows.length === 0) {
            console.log('❌ No active research techniques found. Please run seed_research_techniques_mysql.ts first.');
            await connection.rollback();
            return;
        }

        console.log(`✓ Found ${techniqueRows.length} research techniques`);

        let linkedCount = 0;
        let skippedCount = 0;

        // Link each technique to each research type
        for (const researchType of typeRows) {
            for (const technique of techniqueRows) {
                // Check if relationship already exists
                const [checkRows] = await connection.query<Array<{ id: string }>>(
                    'SELECT id FROM research_types_techniques WHERE research_type_id = ? AND research_technique_id = ?',
                    [researchType.id, technique.id]
                );

                if (checkRows.length > 0) {
                    skippedCount++;
                    continue;
                }

                // Insert the relationship
                await connection.query(
                    `INSERT INTO research_types_techniques (id, research_type_id, research_technique_id, created_at)
                     VALUES (UUID(), ?, ?, NOW())`,
                    [researchType.id, technique.id]
                );

                console.log(`✓ Linked "${technique.name}" to "${researchType.name}"`);
                linkedCount++;
            }
        }

        await connection.commit();
        console.log(`\n✅ Linking completed successfully!`);
        console.log(`   - Linked: ${linkedCount} relationships`);
        console.log(`   - Skipped (already exists): ${skippedCount} relationships`);

        // Show final relationships summary
        console.log('\n📊 Summary of relationships:');
        for (const researchType of typeRows) {
            const [techRows] = await connection.query<Array<{ name: string }>>(
                `SELECT rt.name
                 FROM research_techniques rt
                 INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
                 WHERE rtt.research_type_id = ?
                 ORDER BY rt.name`,
                [researchType.id]
            );

            console.log(`\n   ${researchType.name}:`);
            if (techRows.length === 0) {
                console.log('     (no techniques)');
            } else {
                techRows.forEach((row, index) => {
                    console.log(`     ${index + 1}. ${row.name}`);
                });
            }
        }

    } catch (error) {
        await connection.rollback();
        console.error('❌ Failed to link techniques:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

// Export for use in other scripts
export { linkTechniquesToAllTypes };

// Run if executed directly
if (require.main === module) {
    linkTechniquesToAllTypes().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
