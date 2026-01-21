// Migration script to update NPS module placeholder in existing modules (MySQL)
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Updates the placeholder for nps-title component in existing NPS modules
 */
async function updateNPSPlaceholder() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log('🔄 Updating NPS module placeholder in existing modules...');
        await connection.beginTransaction();

        // Get all NPS modules
        const [modules] = await connection.query<any[]>(
            `SELECT id, name, config FROM modules 
             WHERE name LIKE '%Net Promoter Score%' OR name LIKE '%NPS%'`
        );

        if (modules.length === 0) {
            console.log('⚠️  No NPS modules found to update');
            await connection.commit();
            return;
        }

        console.log(`Found ${modules.length} NPS module(s) to update`);

        const newPlaceholder = 'En una escala del 0 al 10, ¿qué tan probable es que recomiendes [nuestra empresa/producto/servicio] a un amigo o familiar?';
        let updatedCount = 0;

        for (const module of modules) {
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
                    await connection.query(
                        'UPDATE modules SET config = ?, updated_at = NOW() WHERE id = ?',
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

        await connection.commit();
        console.log(`✅ Successfully updated ${updatedCount} of ${modules.length} NPS module(s)`);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Error updating NPS placeholder:', err);
        throw err;
    } finally {
        await connection.end();
    }
}

updateNPSPlaceholder();
