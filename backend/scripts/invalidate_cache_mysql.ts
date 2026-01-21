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
 * Limpia cualquier cache relacionado con research types
 * En este caso, solo verificamos que los datos estén correctos
 */
const invalidateCache = async (): Promise<void> => {
    console.log('Note: Cache invalidation should be handled by the backend service.');
    console.log('This script verifies that the data is correct.');
    console.log('');
    
    const connection = await pool.getConnection();
    try {
        // Verificar research types activos
        const [activeTypes] = await connection.query<Array<{ id: string; name: string }>>(
            'SELECT id, name FROM research_types WHERE is_active = true ORDER BY name'
        );
        
        console.log(`✓ Found ${activeTypes.length} active research types:`);
        activeTypes.forEach((type, index) => {
            console.log(`  ${index + 1}. ${type.name} (${type.id})`);
        });
        
        // Verificar que cada tipo tenga técnicas
        for (const type of activeTypes) {
            const [techs] = await connection.query<Array<{ id: string }>>(
                `SELECT COUNT(*) as count 
                 FROM research_types_techniques 
                 WHERE research_type_id = ?`,
                [type.id]
            );
            const count = (techs[0] as { count: number }).count;
            console.log(`  - ${type.name}: ${count} technique(s)`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        connection.release();
        await pool.end();
    }
};

invalidateCache().catch(console.error);
