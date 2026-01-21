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

/**
 * Desactiva los research types que no deberían estar activos
 * Solo mantiene activos los 4 tipos correctos
 */
const cleanupExtraResearchTypes = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        console.log('Cleaning up extra research types...');
        await connection.beginTransaction();

        // Los 4 tipos que DEBEN estar activos
        const validTypes = [
            'Behavioural Research',
            'Attention\'s Prediction',
            'Insights Finding',
            'Client\'s Benchmark'
        ];

        // Desactivar todos los tipos que NO están en la lista válida
        const placeholders = validTypes.map(() => '?').join(',');
        const [result] = await connection.query(
            `UPDATE research_types 
             SET is_active = false 
             WHERE name NOT IN (${placeholders})`,
            validTypes
        );

        console.log(`✓ Deactivated ${(result as { affectedRows: number }).affectedRows} extra research types`);

        // Verificar resultado
        const [activeTypes] = await connection.query<Array<{ name: string }>>(
            'SELECT name FROM research_types WHERE is_active = true ORDER BY name'
        );

        console.log('\n✓ Active research types:');
        activeTypes.forEach((type, index) => {
            console.log(`  ${index + 1}. ${type.name}`);
        });

        if (activeTypes.length !== 4) {
            console.log(`\n⚠ Warning: Expected 4 active types, found ${activeTypes.length}`);
        }

        await connection.commit();
        console.log('\n✅ Cleanup completed successfully.');
    } catch (error) {
        await connection.rollback();
        console.error('❌ Cleanup failed:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

cleanupExtraResearchTypes().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
