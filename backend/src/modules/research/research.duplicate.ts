import pool from '../../config/database';
import cache, { CacheKeys } from '../../config/cache';
import fs from 'fs';
import { getMediaPath, ensureDirectoryExists } from '../../config/local-storage';
import { getById } from './research.crud';

/**
 * Duplicates an existing research with all its stages, modules, questions,
 * demographic quotas, and media files. The clone is created as 'draft'.
 * Responses and participants are NOT copied.
 */
export const duplicate = async (researchId: string, userId: string, role?: string, customName?: string) => {
    // 1. Fetch the full source research (validates ownership via getById)
    const source = await getById(researchId, userId, role) as Record<string, unknown>;

    // Fetch enterprise_id directly (not included in getById SELECT)
    const rawSource = await pool.query(
        'SELECT enterprise_id FROM researches WHERE id = ?',
        [researchId]
    );
    const enterpriseId = rawSource.rows[0]?.enterprise_id || null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 2. Insert new research
        const newResearchId = crypto.randomUUID();
        const sourceName = source.name as string;
        const newName = customName?.trim() || `${sourceName} - Copy`;

        await client.query(
            `INSERT INTO researches (id, created_by, name, description, research_type_id, research_technique_id, enterprise_id, config, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())`,
            [
                newResearchId,
                userId,
                newName,
                source.description || null,
                source.research_type_id || null,
                source.research_technique_id || null,
                enterpriseId,
                JSON.stringify(source.settings || {}),
            ]
        );

        // 3. Clone stages, modules, questions — build old→new ID maps
        const stages = (source.stages || []) as Array<Record<string, unknown>>;
        const moduleIdMap = new Map<string, string>(); // oldModuleId → newModuleId

        for (const stage of stages) {
            const newStageId = crypto.randomUUID();

            await client.query(
                `INSERT INTO stages (id, research_id, name, description, display_order, stage_type, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [
                    newStageId,
                    newResearchId,
                    stage.name,
                    stage.description || null,
                    stage.order_index ?? 0,
                    stage.stage_type || 'module_collection',
                ]
            );

            const modules = (stage.modules || []) as Array<Record<string, unknown>>;
            for (const mod of modules) {
                const newModuleId = crypto.randomUUID();
                moduleIdMap.set(mod.id as string, newModuleId);

                // Deep clone config — remap will happen after all modules are mapped
                const moduleConfig = JSON.parse(JSON.stringify(mod.config || {}));

                await client.query(
                    `INSERT INTO modules (id, research_id, stage_id, name, description, order_index, is_from_template, config, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        newModuleId,
                        newResearchId,
                        newStageId,
                        mod.name,
                        mod.description || null,
                        mod.order_index ?? 0,
                        mod.is_from_template ? 1 : 0,
                        JSON.stringify(moduleConfig),
                    ]
                );

                // Clone questions
                const questions = (mod.questions || []) as Array<Record<string, unknown>>;
                for (const q of questions) {
                    const newQuestionId = crypto.randomUUID();
                    await client.query(
                        `INSERT INTO questions (id, module_id, question_type, question_text, order_index, config, validation, \`required\`, created_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            newQuestionId,
                            newModuleId,
                            q.type || null,
                            q.text || null,
                            q.order ?? 0,
                            JSON.stringify(q.config || {}),
                            JSON.stringify(q.validation || {}),
                            q.required ? 1 : 0,
                        ]
                    );
                }
            }
        }

        // 4. Remap sourceModuleId in conditionalityConfig for all cloned modules
        for (const [oldId, newId] of moduleIdMap) {
            // Find modules whose config references this oldId
            // Update in-place in DB using JSON_REPLACE would be complex, so we read+update
            const modulesWithCondition = await client.query(
                `SELECT id, config FROM modules
                 WHERE research_id = ? AND config LIKE ?`,
                [newResearchId, `%${oldId}%`]
            );

            for (const row of modulesWithCondition.rows as Array<Record<string, unknown>>) {
                let config = row.config;
                if (typeof config === 'string') {
                    try { config = JSON.parse(config); } catch { continue; }
                }
                const cfg = config as Record<string, unknown>;
                const cc = cfg.conditionalityConfig as Record<string, unknown> | undefined;
                if (cc && cc.sourceModuleId === oldId) {
                    cc.sourceModuleId = newId;
                    await client.query(
                        `UPDATE modules SET config = ? WHERE id = ?`,
                        [JSON.stringify(cfg), row.id]
                    );
                }
            }
        }

        // 5. Clone demographic quotas (reset current_count to 0)
        const quotasResult = await client.query(
            `SELECT demographic_type, quota_value, quota_limit, quota_type, enabled, enforcement_mode
             FROM demographic_quotas
             WHERE research_id = ?`,
            [researchId]
        );

        for (const quota of quotasResult.rows as Array<Record<string, unknown>>) {
            await client.query(
                `INSERT INTO demographic_quotas (id, research_id, demographic_type, quota_value, quota_limit, quota_type, current_count, enabled, enforcement_mode, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW())`,
                [
                    crypto.randomUUID(),
                    newResearchId,
                    quota.demographic_type,
                    quota.quota_value,
                    quota.quota_limit,
                    quota.quota_type || 'percentage',
                    quota.enabled ? 1 : 0,
                    quota.enforcement_mode || 'immediate',
                ]
            );
        }

        // 6. Clone media files (local filesystem copy)
        const mediaResult = await client.query(
            `SELECT id, s3_key, s3_bucket, file_name, file_type, file_size, metadata
             FROM media WHERE research_id = ?`,
            [researchId]
        );

        const mediaIdMap = new Map<string, string>(); // oldMediaId → newMediaId
        for (const media of mediaResult.rows as Array<Record<string, unknown>>) {
            const oldKey = media.s3_key as string;

            // Validate and properly construct the new key
            // Ensure the old key actually belongs to the source research
            const expectedPrefix = `research/${researchId}/`;
            if (!oldKey.startsWith(expectedPrefix)) {
                console.error(`[Research Service] Media key ${oldKey} does not belong to research ${researchId}, skipping`);
                continue;
            }

            // Properly replace only the research ID prefix
            const relativePath = oldKey.substring(expectedPrefix.length);
            const newKey = `research/${newResearchId}/${relativePath}`;
            const newMediaId = crypto.randomUUID();
            mediaIdMap.set(media.id as string, newMediaId);

            // Copy file on disk
            try {
                const srcPath = getMediaPath(oldKey);
                const destPath = getMediaPath(newKey);
                ensureDirectoryExists(destPath);
                fs.copyFileSync(srcPath, destPath);
                console.log(`[Research Service] Successfully copied media: ${oldKey} -> ${newKey}`);
            } catch (fsErr) {
                console.error(`[Research Service] Failed to copy media file ${oldKey}:`, fsErr);
                // Continue with media record creation even if file copy fails
            }

            await client.query(
                `INSERT INTO media (id, research_id, question_id, s3_key, s3_bucket, file_name, file_type, file_size, metadata, created_at)
                 VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, NOW())`,
                [
                    newMediaId,
                    newResearchId,
                    newKey,
                    media.s3_bucket || 'local',
                    media.file_name,
                    media.file_type,
                    media.file_size,
                    typeof media.metadata === 'string' ? media.metadata : JSON.stringify(media.metadata || {}),
                ]
            );
        }

        // 7. Remap mediaId references in research config (stimuli for Attention Prediction / Insights Finding)
        if (mediaIdMap.size > 0) {
            const configResult = await client.query(
                `SELECT config FROM researches WHERE id = ?`,
                [newResearchId]
            );
            let researchConfig = configResult.rows[0]?.config;
            if (typeof researchConfig === 'string') {
                try { researchConfig = JSON.parse(researchConfig); } catch { researchConfig = {}; }
            }
            if (researchConfig && Array.isArray((researchConfig as Record<string, unknown>).stimuli)) {
                let configStr = JSON.stringify(researchConfig);
                for (const [oldMediaId, newMediaId] of mediaIdMap) {
                    configStr = configStr.split(oldMediaId).join(newMediaId);
                }
                await client.query(
                    `UPDATE researches SET config = ? WHERE id = ?`,
                    [configStr, newResearchId]
                );
            }
        }

        await client.query('COMMIT');

        // Invalidate cache
        cache.delete(`${CacheKeys.RESEARCH_LIST}:${userId}`);

        // Return the newly created research
        return await getById(newResearchId, userId, role);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Research Service] Error duplicating research:', error);
        throw error;
    } finally {
        client.release();
    }
};
