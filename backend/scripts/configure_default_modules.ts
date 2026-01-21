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
 * Configures default modules for each research type
 */
const configureDefaultModules = async (): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        console.log('🔧 Configuring default modules for research types...\n');
        await connection.beginTransaction();

        // Configuration for each research type
        // Stage template names: "Smart VOC", "Cognitive Tasks"
        const configurations = [
            {
                name: 'Behavioural Research',
                description: 'Behavioral research with cognitive tasks and VOC modules',
                modules: [
                    { name: 'Smart VOC', order: 1, is_default: true },
                    { name: 'Cognitive Tasks', order: 2, is_default: true }
                ]
            },
            {
                name: "Attention's Prediction",
                description: 'Attention prediction research with comprehensive modules',
                modules: [
                    { name: 'Smart VOC', order: 1, is_default: true },
                    { name: 'Cognitive Tasks', order: 2, is_default: true }
                ]
            },
            {
                name: 'Insights Finding',
                description: 'Insights discovery research with VOC and cognitive modules',
                modules: [
                    { name: 'Smart VOC', order: 1, is_default: true },
                    { name: 'Cognitive Tasks', order: 2, is_default: true }
                ]
            },
            {
                name: "Client's Benchmark",
                description: 'Client benchmarking with VOC modules',
                modules: [
                    { name: 'Smart VOC', order: 1, is_default: true }
                ]
            }
        ];

        for (const config of configurations) {
            // Get research type ID
            const [rows] = await connection.query<Array<{ id: string; name: string }>>(
                'SELECT id, name FROM research_types WHERE name = ?',
                [config.name]
            );

            if (rows.length === 0) {
                console.log(`⚠️  Skipped: ${config.name} (not found)`);
                continue;
            }

            const typeId = rows[0].id;
            
            // Prepare default_modules JSON
            const defaultModules = JSON.stringify(config.modules);
            
            // Update research type
            await connection.query(
                'UPDATE research_types SET default_modules = ?, description = ? WHERE id = ?',
                [defaultModules, config.description, typeId]
            );

            console.log(`✅ ${config.name}`);
            console.log(`   Modules: ${config.modules.map(m => m.name).join(', ')}`);
            console.log('');
        }

        await connection.commit();
        console.log('✅ Configuration completed successfully!');
        
        // Display summary
        console.log('\n📋 Summary:');
        const [allTypes] = await connection.query<Array<{ 
            name: string; 
            default_modules: string | null 
        }>>(
            'SELECT name, default_modules FROM research_types WHERE is_active = 1 ORDER BY name'
        );

        for (const type of allTypes) {
            console.log(`\n📋 ${type.name}`);
            if (type.default_modules) {
                try {
                    const modules = typeof type.default_modules === 'string' 
                        ? JSON.parse(type.default_modules) 
                        : type.default_modules;
                    
                    if (Array.isArray(modules) && modules.length > 0) {
                        console.log(`   Default modules (${modules.length}):`);
                        modules.forEach((m: any, i: number) => {
                            console.log(`     ${i + 1}. ${m.name}`);
                        });
                    } else {
                        console.log('   No default modules');
                    }
                } catch (e) {
                    console.log('   Error parsing modules');
                }
            } else {
                console.log('   No default modules');
            }
        }

    } catch (error) {
        await connection.rollback();
        console.error('❌ Configuration failed:', error);
        throw error;
    } finally {
        connection.release();
        await pool.end();
    }
};

// Export for use in other scripts
export { configureDefaultModules };

// Run if executed directly
if (require.main === module) {
    configureDefaultModules().catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
