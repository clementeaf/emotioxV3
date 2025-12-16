import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface SmokeModuleIds {
    shortText?: string;
    csat?: string;
    nev?: string;
    voc?: string;
}

interface CreatedResearchContext {
    researchId: string;
    moduleIds: Required<Pick<SmokeModuleIds, 'shortText'>> & Partial<Omit<SmokeModuleIds, 'shortText'>>;
}

/**
 * Exits the process with a message.
 * @param message - Message to print
 * @param code - Exit code
 */
const exitWith = (message: string, code: number): never => {
    // eslint-disable-next-line no-console
    console.log(message);
    process.exit(code);
};

/**
 * Finds key module ids by name heuristics.
 * @param researchId - Research ID
 * @returns Map of module ids for smoke data
 */
const findModuleIds = async (researchId: string): Promise<SmokeModuleIds> => {
    const { default: pool } = await import('../src/config/database');
    const query = `
        SELECT id, name
        FROM modules
        WHERE research_id = $1
    `;
    const result = await pool.query(query, [researchId]);
    const rows = result.rows as Array<{ id: string; name: string }>;

    const ids: SmokeModuleIds = {};
    rows.forEach((row) => {
        const name = row.name.toLowerCase();
        if (!ids.shortText && name.includes('short text')) ids.shortText = row.id;
        if (!ids.csat && (name.includes('csat') || name.includes('customer satisfaction'))) ids.csat = row.id;
        if (!ids.nev && (name.includes('nev') || name.includes('net emotional'))) ids.nev = row.id;
        if (!ids.voc && (name.includes('(voc)') || name.includes('voice of costumer') || name.includes('voice of customer'))) ids.voc = row.id;
    });
    return ids;
};

/**
 * Creates a minimal research with stages and modules for smoke testing.
 * This avoids relying on pre-seeded data in CI.
 * @returns Created research context
 */
const createSmokeResearch = async (): Promise<CreatedResearchContext> => {
    const { default: pool } = await import('../src/config/database');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query(
            `INSERT INTO users (email, cognito_sub, role)
             VALUES ($1, $2, 'researcher')
             ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
             RETURNING id`,
            [`smoke_${Date.now()}@example.com`, `smoke-sub-${Date.now()}`]
        );
        const userId: string = userRes.rows[0].id as string;

        const researchRes = await client.query(
            `INSERT INTO researches (user_id, name, description, status)
             VALUES ($1, $2, $3, 'active')
             RETURNING id`,
            [userId, `Smoke Research ${Date.now()}`, 'CI smoke research']
        );
        const researchId: string = researchRes.rows[0].id as string;

        const stagesRes = await client.query(
            `INSERT INTO stages (research_id, name, description, order_index, stage_type)
             VALUES
               ($1, 'Smart VOC', 'Smoke stage', 1, 'module_collection'),
               ($1, 'Cognitive Tasks', 'Smoke stage', 2, 'module_collection')
             RETURNING id, name`,
            [researchId]
        );

        const stageIdByName = new Map<string, string>();
        (stagesRes.rows as Array<{ id: string; name: string }>).forEach((r) => stageIdByName.set(r.name, r.id));
        const smartVocStageId = stageIdByName.get('Smart VOC');
        const cognitiveStageId = stageIdByName.get('Cognitive Tasks');
        if (!smartVocStageId || !cognitiveStageId) {
            throw new Error('Failed to create smoke stages');
        }

        const shortTextConfig = {
            structure: {
                components: [
                    { id: 'short-text-title', name: 'Title', type: 'input', label: 'Title', defaultValue: 'Short Text', required: false, order: 1 },
                    { id: 'short-text-description', name: 'Description', type: 'textarea', label: 'Description', defaultValue: 'Describe…', required: false, order: 2 },
                    { id: 'short-text-placeholder', name: 'Placeholder', type: 'input', label: 'Placeholder', defaultValue: 'Write here…', required: false, order: 3 },
                ],
            },
        };

        const csatConfig = {
            structure: {
                components: [
                    { id: 'csat-title', name: 'Title', type: 'input', label: 'Title', defaultValue: 'CSAT', required: false, order: 1 },
                    { id: 'csat-description', name: 'Description', type: 'textarea', label: 'Description', defaultValue: 'Rate…', required: false, order: 2 },
                    { id: 'csat-display-type', name: 'Display', type: 'select', label: 'Display', defaultValue: 'stars', required: false, order: 3 },
                ],
            },
        };

        const nevConfig = {
            structure: {
                components: [
                    { id: 'nev-title', name: 'Title', type: 'input', label: 'Title', defaultValue: 'NEV', required: false, order: 1 },
                    { id: 'nev-description', name: 'Description', type: 'textarea', label: 'Description', defaultValue: 'Select emotions', required: false, order: 2 },
                ],
            },
        };

        const vocConfig = {
            structure: {
                components: [
                    { id: 'voc-title', name: 'Title', type: 'input', label: 'Title', defaultValue: 'VOC', required: false, order: 1 },
                    { id: 'voc-description', name: 'Description', type: 'textarea', label: 'Description', defaultValue: 'Comment…', required: false, order: 2 },
                ],
            },
        };

        const modulesRes = await client.query(
            `INSERT INTO modules (research_id, stage_id, name, description, order_index, is_from_template, config)
             VALUES
               ($1, $2, 'Short Text', 'Smoke module', 1, false, $3::jsonb),
               ($1, $4, 'Customer Satisfaction Score (CSAT)', 'Smoke module', 1, false, $5::jsonb),
               ($1, $4, 'Net Emotional Value (NEV)', 'Smoke module', 2, false, $6::jsonb),
               ($1, $4, 'Voice of Customer (VOC)', 'Smoke module', 3, false, $7::jsonb)
             RETURNING id, name`,
            [
                researchId,
                cognitiveStageId,
                JSON.stringify(shortTextConfig),
                smartVocStageId,
                JSON.stringify(csatConfig),
                JSON.stringify(nevConfig),
                JSON.stringify(vocConfig),
            ]
        );

        const moduleIdByName = new Map<string, string>();
        (modulesRes.rows as Array<{ id: string; name: string }>).forEach((r) => moduleIdByName.set(r.name, r.id));
        const shortTextId = moduleIdByName.get('Short Text');
        if (!shortTextId) throw new Error('Failed to create Short Text module');

        await client.query('COMMIT');

        return {
            researchId,
            moduleIds: {
                shortText: shortTextId,
                csat: moduleIdByName.get('Customer Satisfaction Score (CSAT)'),
                nev: moduleIdByName.get('Net Emotional Value (NEV)'),
                voc: moduleIdByName.get('Voice of Customer (VOC)'),
            },
        };
    } catch (err: unknown) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

/**
 * Runs the end-to-end smoke test:
 * public research -> submit responses -> analytics results.
 * @returns Promise<void>
 */
const main = async (): Promise<void> => {
    const configuredResearchId = process.env.RESEARCH_ID;
    const participantId = process.env.PARTICIPANT_ID ?? `smoke-${Date.now()}`;
    const { default: pool } = await import('../src/config/database');
    const publicService = await import('../src/modules/public/public.service');
    const analyticsService = await import('../src/modules/analytics/analytics.service');

    const context: CreatedResearchContext | null = configuredResearchId ? null : await createSmokeResearch();
    const researchId = configuredResearchId ?? context!.researchId;

    // 1) Public research payload should contain stages/modules/structure
    const research = await publicService.getResearch(researchId);
    if (!research || typeof research !== 'object') {
        exitWith('SMOKE FAIL: publicService.getResearch returned invalid research', 1);
    }
    if (!Array.isArray((research as { stages?: unknown }).stages)) {
        exitWith('SMOKE FAIL: public research has no stages array', 1);
    }

    const stages = (research as { stages: Array<{ modules?: unknown }> }).stages;
    const allModules = stages.flatMap((s) => (Array.isArray(s.modules) ? s.modules : []));
    if (allModules.length === 0) {
        exitWith('SMOKE FAIL: public research has zero modules', 1);
    }
    const hasStructure = allModules.some((m) => {
        const mm = m as { structure?: unknown };
        const structure = mm.structure as { components?: unknown } | undefined;
        return Boolean(structure && Array.isArray(structure.components));
    });
    if (!hasStructure) {
        exitWith('SMOKE FAIL: public modules do not include structure.components[]', 1);
    }

    // 2) Insert a minimal set of participant-like responses
    const moduleIds = configuredResearchId ? await findModuleIds(researchId) : context!.moduleIds;
    if (!moduleIds.shortText) exitWith('SMOKE FAIL: could not find "Short Text" module id', 1);

    await publicService.saveParticipantResponses(researchId, {
        participantId,
        moduleId: moduleIds.shortText,
        responses: [
            {
                moduleId: moduleIds.shortText,
                componentId: 'answer',
                value: 'smoke text answer',
                metadata: { timestamp: Date.now() },
            },
        ],
        metadata: { completedAt: Date.now() },
    });

    if (moduleIds.csat) {
        await publicService.saveParticipantResponses(researchId, {
            participantId,
            moduleId: moduleIds.csat,
            responses: [
                {
                    moduleId: moduleIds.csat,
                    componentId: 'scale',
                    value: 5,
                    metadata: { timestamp: Date.now() },
                },
            ],
            metadata: { completedAt: Date.now() },
        });
    }

    if (moduleIds.nev) {
        await publicService.saveParticipantResponses(researchId, {
            participantId,
            moduleId: moduleIds.nev,
            responses: [
                {
                    moduleId: moduleIds.nev,
                    componentId: 'emotions',
                    value: ['feliz'],
                    metadata: { timestamp: Date.now() },
                },
            ],
            metadata: { completedAt: Date.now() },
        });
    }

    if (moduleIds.voc) {
        await publicService.saveParticipantResponses(researchId, {
            participantId,
            moduleId: moduleIds.voc,
            responses: [
                {
                    moduleId: moduleIds.voc,
                    componentId: 'text',
                    value: 'smoke voc comment',
                    metadata: { timestamp: Date.now() },
                },
            ],
            metadata: { completedAt: Date.now() },
        });
    }

    // 3) Analytics should see the cognitive text response
    const textResults = await analyticsService.getTextResponses(researchId, moduleIds.shortText);
    if (!textResults || typeof textResults.totalResponses !== 'number' || textResults.totalResponses < 1) {
        exitWith('SMOKE FAIL: analytics getTextResponses returned zero totalResponses', 1);
    }

    // 4) SmartVOC analytics should not crash (and should reflect at least one response if modules exist)
    const smartVocResults = await analyticsService.getSmartVOCResults(researchId);
    if (!smartVocResults || typeof smartVocResults.totalResponses !== 'number') {
        exitWith('SMOKE FAIL: analytics getSmartVOCResults returned invalid payload', 1);
    }

    exitWith(
        `SMOKE OK: researchId=${researchId} participantId=${participantId} textResponses=${textResults.totalResponses} smartVocTotalResponses=${smartVocResults.totalResponses}`,
        0
    );
};

main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error';
    exitWith(`SMOKE FAIL: ${message}`, 1);
});


