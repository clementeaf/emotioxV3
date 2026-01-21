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

const addStageTypeColumn = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        console.log('Checking stages table structure...');
        
        const [columns] = await connection.query<Array<{ 
            COLUMN_NAME: string; 
            DATA_TYPE: string;
            COLUMN_TYPE: string;
        }>>(
            `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
             FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = DATABASE() 
             AND TABLE_NAME = 'stages'
             ORDER BY ORDINAL_POSITION`
        );
        
        console.log('\nColumns in stages table:');
        columns.forEach((col) => {
            console.log(`  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
        });
        
        const hasStageType = columns.some(col => col.COLUMN_NAME === 'stage_type');
        console.log('\nstage_type column exists:', hasStageType);
        
        if (!hasStageType) {
            console.log('\n⚠️  Adding stage_type column...');
            await connection.query(
                `ALTER TABLE stages 
                 ADD COLUMN stage_type VARCHAR(50) DEFAULT 'module_collection' AFTER display_order`
            );
            console.log('✅ Column added successfully');
            
            // Verify
            const [newColumns] = await connection.query<Array<{ COLUMN_NAME: string }>>(
                `SELECT COLUMN_NAME 
                 FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'stages'
                 AND COLUMN_NAME = 'stage_type'`
            );
            
            if (newColumns.length > 0) {
                console.log('✅ Verification: stage_type column exists');
            }
        } else {
            console.log('✅ Column already exists, no action needed');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

if (require.main === module) {
    addStageTypeColumn().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
