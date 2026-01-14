// Migration script to update NPS module placeholder in existing modules
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

/**
 * Updates the placeholder for nps-title component in existing NPS modules
 */
async function updateNPSPlaceholder() {
    const client = await pool.connect();
    try {
        console.log('🔄 Updating NPS module placeholder in existing modules...');
        await client.query('BEGIN');

        // Get all NPS modules
        const modulesResult = await client.query(
            `SELECT id, name, config FROM modules 
             WHERE name ILIKE '%Net Promoter Score%' OR name ILIKE '%NPS%'`
        );

        if (modulesResult.rows.length === 0) {
            console.log('⚠️  No NPS modules found to update');
            await client.query('COMMIT');
            return;
        }

        console.log(`Found ${modulesResult.rows.length} NPS module(s) to update`);

        const newPlaceholder = 'En una escala del 0 al 10, ¿qué tan probable es que recomiendes [nuestra empresa/producto/servicio] a un amigo o familiar?';
        let updatedCount = 0;

        for (const module of modulesResult.rows) {
            try {
                let config = module.config;
                
                // Parse if string
                if (typeof config === 'string') {
                    config = JSON.parse(config);
                }

                // Ensure structure exists
                if (!config.structure || !config.structure.components) {
                    console.log(`⚠️  Module ${module.id} (${module.name}) has no structure, skipping...`);
                    continue;
                }

                // Find and update nps-title component
                const components = config.structure.components;
                const titleComponent = components.find((c: { id?: string }) => c.id === 'nps-title');

                if (titleComponent) {
                    // Update placeholder
                    if (!titleComponent.placeholder) {
                        titleComponent.placeholder = { enabled: true, text: newPlaceholder };
                    } else {
                        titleComponent.placeholder.enabled = true;
                        titleComponent.placeholder.text = newPlaceholder;
                    }

                    // Update module in database
                    await client.query(
                        'UPDATE modules SET config = $1, updated_at = NOW() WHERE id = $2',
                        [JSON.stringify(config), module.id]
                    );

                    updatedCount++;
                    console.log(`✓ Updated module: ${module.name} (${module.id})`);
                } else {
                    console.log(`⚠️  Module ${module.id} (${module.name}) has no nps-title component, skipping...`);
                }
            } catch (error) {
                console.error(`❌ Error updating module ${module.id}:`, error);
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully updated ${updatedCount} of ${modulesResult.rows.length} NPS module(s)`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error updating NPS placeholder:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

updateNPSPlaceholder();
