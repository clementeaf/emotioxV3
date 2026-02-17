// Migration script to remove dead 'image-upload' components from existing modules (MySQL)
// The image-upload component was never rendered (returns null in EditableComponent).
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function removeImageUploadFromModules() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log('🔄 Removing image-upload components from existing modules...');
        await connection.beginTransaction();

        // Find all modules whose config contains 'image-upload'
        const [modules] = await connection.query<mysql.RowDataPacket[]>(
            `SELECT id, name, config FROM modules WHERE config LIKE '%image-upload%'`
        );

        if (modules.length === 0) {
            console.log('✅ No modules with image-upload found. Nothing to do.');
            await connection.commit();
            return;
        }

        console.log(`Found ${modules.length} module(s) with image-upload`);
        let updatedCount = 0;
        let skippedCount = 0;

        for (const mod of modules) {
            try {
                const config = typeof mod.config === 'string' ? JSON.parse(mod.config) : mod.config;
                const components = config?.structure?.components;

                if (!Array.isArray(components)) {
                    console.log(`  ⏭️  ${mod.name} (${mod.id}): no components array, skipping`);
                    skippedCount++;
                    continue;
                }

                const hasImageUpload = components.some((c: { type: string }) => c.type === 'image-upload');
                if (!hasImageUpload) {
                    console.log(`  ⏭️  ${mod.name} (${mod.id}): no image-upload component found, skipping`);
                    skippedCount++;
                    continue;
                }

                // Filter out image-upload and re-number orders
                const filtered = components
                    .filter((c: { type: string }) => c.type !== 'image-upload')
                    .map((c: Record<string, unknown>, i: number) => ({ ...c, order: i + 1 }));

                config.structure.components = filtered;

                await connection.query(
                    `UPDATE modules SET config = ? WHERE id = ?`,
                    [JSON.stringify(config), mod.id]
                );

                console.log(`  ✅ ${mod.name} (${mod.id}): removed image-upload, ${filtered.length} components remain`);
                updatedCount++;
            } catch (err) {
                console.error(`  ❌ Error processing ${mod.name} (${mod.id}):`, err);
                skippedCount++;
            }
        }

        // Also update module_templates
        const [templates] = await connection.query<mysql.RowDataPacket[]>(
            `SELECT id, name, structure FROM module_templates WHERE structure LIKE '%image-upload%'`
        );

        let templateCount = 0;
        for (const tmpl of templates) {
            try {
                const structure = typeof tmpl.structure === 'string' ? JSON.parse(tmpl.structure) : tmpl.structure;
                const components = structure?.components;

                if (!Array.isArray(components)) continue;

                const filtered = components
                    .filter((c: { type: string }) => c.type !== 'image-upload')
                    .map((c: Record<string, unknown>, i: number) => ({ ...c, order: i + 1 }));

                structure.components = filtered;

                await connection.query(
                    `UPDATE module_templates SET structure = ? WHERE id = ?`,
                    [JSON.stringify(structure), tmpl.id]
                );

                console.log(`  ✅ Template "${tmpl.name}" (${tmpl.id}): removed image-upload`);
                templateCount++;
            } catch (err) {
                console.error(`  ❌ Error processing template ${tmpl.name} (${tmpl.id}):`, err);
            }
        }

        await connection.commit();
        console.log(`\n🎉 Done! Modules updated: ${updatedCount}, skipped: ${skippedCount}. Templates updated: ${templateCount}`);
    } catch (error) {
        await connection.rollback();
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

removeImageUploadFromModules().catch(console.error);
