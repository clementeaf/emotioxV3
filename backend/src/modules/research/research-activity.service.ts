import pool from '../../config/database';

export interface ResearchActivityLog {
    id: string;
    researchId: string;
    researchName: string | null;
    researchTechniqueName: string | null;
    actorUserId: string | null;
    actorName: string | null;
    actorEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    summary: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

/**
 * Derives research activity from existing tables (researches, stages, modules, responses, users).
 * No dedicated activity_logs table needed.
 */
export const listAllResearchActivity = async (): Promise<ResearchActivityLog[]> => {
    const result = await pool.query(
        `SELECT
            r.id AS research_id,
            r.name AS research_name,
            r.status,
            r.created_at,
            r.updated_at,
            rt.name AS research_technique_name,
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.email,
            (SELECT COUNT(*) FROM stages s WHERE s.research_id = r.id) AS stage_count,
            (SELECT COUNT(*) FROM modules m JOIN stages s2 ON s2.id = m.stage_id WHERE s2.research_id = r.id) AS module_count,
            (SELECT COUNT(DISTINCT resp.participant_id) FROM responses resp WHERE resp.research_id = r.id) AS participant_count,
            (SELECT COUNT(*) FROM responses resp2 WHERE resp2.research_id = r.id) AS response_count,
            (SELECT MAX(resp3.created_at) FROM responses resp3 WHERE resp3.research_id = r.id) AS last_response_at
         FROM researches r
         LEFT JOIN research_techniques rt ON rt.id = r.research_technique_id
         LEFT JOIN users u ON u.id = r.created_by
         WHERE r.deleted_at IS NULL
         ORDER BY r.updated_at DESC`
    );

    return result.rows.map((row) => {
        const actorName = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
        const status = row.status || 'draft';
        const stageCount = Number(row.stage_count) || 0;
        const moduleCount = Number(row.module_count) || 0;
        const participantCount = Number(row.participant_count) || 0;
        const responseCount = Number(row.response_count) || 0;

        let action = 'research.updated';
        let summary = `${row.research_name} — ${status}`;
        if (status === 'draft' && moduleCount === 0) {
            action = 'research.created';
            summary = `Research created: ${row.research_name}`;
        } else if (status === 'active') {
            action = 'research.active';
            summary = `${row.research_name} — active, ${participantCount} participants, ${responseCount} responses`;
        } else if (status === 'closed' || status === 'completed') {
            action = `research.${status}`;
            summary = `${row.research_name} — ${status}, ${participantCount} participants`;
        } else {
            summary = `${row.research_name} — ${status}, ${stageCount} stages, ${moduleCount} modules`;
        }

        return {
            id: row.research_id,
            researchId: row.research_id,
            researchName: row.research_name || null,
            researchTechniqueName: row.research_technique_name || null,
            actorUserId: row.user_id || null,
            actorName,
            actorEmail: row.email || null,
            action,
            entityType: 'research',
            entityId: row.research_id,
            summary,
            metadata: {
                status,
                stageCount,
                moduleCount,
                participantCount,
                responseCount,
                lastResponseAt: row.last_response_at || null,
            },
            createdAt: row.updated_at || row.created_at,
        };
    });
};

export const listResearchActivity = async (researchId: string): Promise<ResearchActivityLog[]> => {
    const result = await pool.query(
        `SELECT
            r.id AS research_id,
            r.name AS research_name,
            r.status,
            r.created_at,
            r.updated_at,
            rt.name AS research_technique_name,
            u.id AS user_id,
            u.first_name,
            u.last_name,
            u.email,
            (SELECT COUNT(*) FROM stages s WHERE s.research_id = r.id) AS stage_count,
            (SELECT COUNT(*) FROM modules m JOIN stages s2 ON s2.id = m.stage_id WHERE s2.research_id = r.id) AS module_count,
            (SELECT COUNT(DISTINCT resp.participant_id) FROM responses resp WHERE resp.research_id = r.id) AS participant_count,
            (SELECT COUNT(*) FROM responses resp2 WHERE resp2.research_id = r.id) AS response_count,
            (SELECT MAX(resp3.created_at) FROM responses resp3 WHERE resp3.research_id = r.id) AS last_response_at
         FROM researches r
         LEFT JOIN research_techniques rt ON rt.id = r.research_technique_id
         LEFT JOIN users u ON u.id = r.created_by
         WHERE r.id = ? AND r.deleted_at IS NULL`,
        [researchId]
    );

    return result.rows.map((row) => {
        const actorName = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
        const status = row.status || 'draft';

        return {
            id: row.research_id,
            researchId: row.research_id,
            researchName: row.research_name || null,
            researchTechniqueName: row.research_technique_name || null,
            actorUserId: row.user_id || null,
            actorName,
            actorEmail: row.email || null,
            action: `research.${status}`,
            entityType: 'research',
            entityId: row.research_id,
            summary: `${row.research_name} — ${status}, ${row.stage_count} stages, ${row.module_count} modules, ${row.participant_count} participants, ${row.response_count} responses`,
            metadata: {
                status,
                stageCount: Number(row.stage_count) || 0,
                moduleCount: Number(row.module_count) || 0,
                participantCount: Number(row.participant_count) || 0,
                responseCount: Number(row.response_count) || 0,
                lastResponseAt: row.last_response_at || null,
            },
            createdAt: row.updated_at || row.created_at,
        };
    });
};

// No-op: no longer writes to a dedicated table
export const logResearchActivity = async (): Promise<void> => {
    // Activity is derived from existing tables, no write needed
};
