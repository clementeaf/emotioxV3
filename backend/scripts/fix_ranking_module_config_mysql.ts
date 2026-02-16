// Migration script to fix Ranking module config in existing modules (MySQL)
// Replaces broken/generic configs with the correct ranking-list structure
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CORRECT_RANKING_COMPONENTS = [
    { id: 'question-title', type: 'input', label: 'Question', placeholder: { enabled: true, text: 'Rank the following items' }, required: true, order: 1 },
    { id: 'question-image', type: 'image-upload', label: 'Image (optional)', required: false, order: 2 },
    { id: 'items', type: 'ranking-list', label: 'Items to rank', required: true, order: 3, settings: { minItems: 2, maxItems: 10 } }
];

async function fixRankingModuleConfigs() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306'),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    try {
        console.log('🔄 Fixing Ranking module configs in existing modules...');
        await connection.beginTransaction();

        const [modules] = await connection.query<any[]>(
            `SELECT id, name, config FROM modules WHERE name = 'Ranking'`
        );

        if (modules.length === 0) {
            console.log('⚠️  No Ranking modules found');
            await connection.commit();
            return;
        }

        console.log(`Found ${modules.length} Ranking module(s)`);
        let updatedCount = 0;
        let skippedCount = 0;

        for (const module of modules) {
            try {
                let config = module.config;
                if (typeof config === 'string') {
                    config = JSON.parse(config);
                }

                // Check if already has the correct ranking-list component
                const components = config?.structure?.components;
                if (Array.isArray(components)) {
                    const hasRankingList = components.some((c: any) => c.id === 'items' && c.type === 'ranking-list');
                    if (hasRankingList) {
                        console.log(`- Module ${module.id} already has correct ranking-list config, skipping`);
                        skippedCount++;
                        continue;
                    }
                }

                // Preserve existing required/hidden flags
                const existingRequired = config?.required;
                const existingHidden = config?.hidden;

                // Build corrected config, preserving any saved question-title value
                const existingTitleValue = components?.find((c: any) => c.id === 'question-title')?.value;
                const correctedComponents = CORRECT_RANKING_COMPONENTS.map(comp => {
                    if (comp.id === 'question-title' && existingTitleValue) {
                        return { ...comp, value: existingTitleValue };
                    }
                    return { ...comp };
                });

                const newConfig: Record<string, unknown> = {
                    structure: { components: correctedComponents },
                };
                if (existingRequired !== undefined) newConfig.required = existingRequired;
                if (existingHidden !== undefined) newConfig.hidden = existingHidden;

                await connection.query(
                    'UPDATE modules SET config = ?, updated_at = NOW() WHERE id = ?',
                    [JSON.stringify(newConfig), module.id]
                );

                updatedCount++;
                console.log(`✓ Fixed module: ${module.name} (${module.id})`);
            } catch (error) {
                console.error(`❌ Error fixing module ${module.id}:`, error);
            }
        }

        await connection.commit();
        console.log(`✅ Done: ${updatedCount} fixed, ${skippedCount} already correct, ${modules.length} total`);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Error fixing Ranking configs:', err);
        throw err;
    } finally {
        await connection.end();
    }
}

fixRankingModuleConfigs();
