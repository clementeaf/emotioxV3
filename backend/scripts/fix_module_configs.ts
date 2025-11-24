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

const fixModuleConfigs = async () => {
    const client = await pool.connect();
    try {
        console.log('🔧 Fixing module configs for Thank You Screen and Welcome Screen...');
        await client.query('BEGIN');

        // Obtener módulos que tienen config con components directamente (sin structure)
        const modulesResult = await client.query(
            `SELECT id, name, config 
             FROM modules 
             WHERE name IN ('Thank You Screen', 'Welcome Screen')
             AND config IS NOT NULL`
        );

        console.log(`Found ${modulesResult.rows.length} module(s) to check`);

        for (const module of modulesResult.rows) {
            let config = typeof module.config === 'string' 
                ? JSON.parse(module.config) 
                : module.config;

            // Si el config tiene components directamente pero no tiene structure, reorganizarlo
            if (config && typeof config === 'object' && 'components' in config && !('structure' in config)) {
                const newConfig = {
                    structure: {
                        components: config.components
                    }
                };

                await client.query(
                    `UPDATE modules 
                     SET config = $1, updated_at = NOW()
                     WHERE id = $2`,
                    [JSON.stringify(newConfig), module.id]
                );

                console.log(`✓ Fixed config for module "${module.name}" (${module.id})`);
            } else if (config && typeof config === 'object' && 'structure' in config) {
                console.log(`  - Module "${module.name}" already has correct structure`);
            } else {
                console.log(`  - Module "${module.name}" has no components in config`);
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Module configs fixed successfully!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error fixing module configs:', error);
    } finally {
        client.release();
        await pool.end();
    }
};

fixModuleConfigs();

