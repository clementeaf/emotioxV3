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
 * Seeds research types into the database
 */
const seedResearchTypes = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        console.log('Starting seed for research types...');
        await connection.beginTransaction();

        // Check if is_active and created_by columns exist
        const [columns] = await connection.query<Array<{ COLUMN_NAME: string }>>(
            `SELECT COLUMN_NAME 
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'research_types' 
             AND COLUMN_NAME IN ('is_active', 'created_by')`
        );
        
        const hasIsActive = columns.some(col => col.COLUMN_NAME === 'is_active');
        const hasCreatedBy = columns.some(col => col.COLUMN_NAME === 'created_by');

        // Get a user ID if created_by column exists
        let userId: string | null = null;
        if (hasCreatedBy) {
            const [userRows] = await connection.query<Array<{ id: string }>>(
                'SELECT id FROM users LIMIT 1'
            );
            userId = userRows.length > 0 ? userRows[0].id : null;

            if (!userId) {
                console.log('⚠ Warning: No users found. Seeding without created_by.');
            }
        }

        const types = [
            'Behavioural Research',
            'Attention\'s Prediction',
            'Insights Finding',
            'Client\'s Benchmark'
        ];

        for (const name of types) {
            // Check if exists
            const [checkRows] = await connection.query<Array<{ id: string }>>(
                'SELECT id FROM research_types WHERE name = ?',
                [name]
            );
            
            if (checkRows.length === 0) {
                // Build INSERT query based on available columns
                // We need to build the VALUES part with functions and parameters in the correct order
                const columns: string[] = [];
                const valueParts: string[] = [];
                const paramValues: unknown[] = [];
                
                // id uses UUID() function
                columns.push('id');
                valueParts.push('UUID()');
                
                // name and description are parameters
                columns.push('name', 'description');
                valueParts.push('?', '?');
                paramValues.push(name, `Default type: ${name}`);
                
                if (hasIsActive) {
                    columns.push('is_active');
                    valueParts.push('?');
                    paramValues.push(true);
                }
                
                if (hasCreatedBy && userId) {
                    columns.push('created_by');
                    valueParts.push('?');
                    paramValues.push(userId);
                }

                // Add timestamps
                columns.push('created_at', 'updated_at');
                valueParts.push('NOW()', 'NOW()');

                // Build query with SQL functions and parameters in correct order
                const query = `INSERT INTO research_types (${columns.join(', ')}) VALUES (${valueParts.join(', ')})`;
                
                await connection.query(query, paramValues);
                console.log(`✓ Inserted: ${name}`);
            } else {
                console.log(`⚠ Skipped (already exists): ${name}`);
            }
        }

        await connection.commit();
        console.log('✅ Seed completed successfully.');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

// Export for use in other scripts
export { seedResearchTypes };

// Run if executed directly
if (require.main === module) {
    seedResearchTypes().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
