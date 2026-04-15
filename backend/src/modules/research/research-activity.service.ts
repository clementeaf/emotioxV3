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

export interface TimelineEvent {
    type: 'research_created' | 'research_started' | 'research_completed' | 'stage_added' | 'module_added' | 'module_updated' | 'first_response' | 'last_response';
    date: string;
    label: string;
}

export interface ResearchDetail {
    research: {
        id: string;
        name: string;
        status: string;
        technique: string | null;
        creator: string | null;
        creatorEmail: string | null;
        createdAt: string;
        updatedAt: string;
        startedAt: string | null;
        completedAt: string | null;
    };
    stages: Array<{ id: string; name: string; createdAt: string; updatedAt: string; moduleCount: number }>;
    modules: Array<{ id: string; name: string; stageName: string | null; createdAt: string; updatedAt: string }>;
    responseStats: { total: number; uniqueParticipants: number; firstResponse: string | null; lastResponse: string | null };
    timeline: TimelineEvent[];
}

export const getResearchDetail = async (researchId: string): Promise<ResearchDetail> => {
    const [researchResult, stagesResult, modulesResult, statsResult] = await Promise.all([
        pool.query(
            `SELECT r.id, r.name, r.status, r.created_at, r.updated_at, r.started_at, r.completed_at,
                    rt.name AS technique_name,
                    u.first_name, u.last_name, u.email
             FROM researches r
             LEFT JOIN research_techniques rt ON rt.id = r.research_technique_id
             LEFT JOIN users u ON u.id = r.created_by
             WHERE r.id = ? AND r.deleted_at IS NULL`,
            [researchId]
        ),
        pool.query(
            `SELECT s.id, s.name, s.created_at, s.updated_at,
                    (SELECT COUNT(*) FROM modules m WHERE m.stage_id = s.id) AS module_count
             FROM stages s
             WHERE s.research_id = ?
             ORDER BY s.display_order ASC`,
            [researchId]
        ),
        pool.query(
            `SELECT m.id, m.name, m.created_at, m.updated_at, s.name AS stage_name
             FROM modules m
             LEFT JOIN stages s ON s.id = m.stage_id
             WHERE m.research_id = ?
             ORDER BY m.order_index ASC`,
            [researchId]
        ),
        pool.query(
            `SELECT COUNT(*) AS total,
                    COUNT(DISTINCT participant_id) AS unique_participants,
                    MIN(created_at) AS first_response,
                    MAX(created_at) AS last_response
             FROM responses WHERE research_id = ?`,
            [researchId]
        ),
    ]);

    const r = researchResult.rows[0];
    if (!r) throw new Error('Research not found');

    const creatorName = [r.first_name, r.last_name].filter(Boolean).join(' ') || null;
    const research = {
        id: r.id,
        name: r.name,
        status: r.status || 'draft',
        technique: r.technique_name || null,
        creator: creatorName,
        creatorEmail: r.email || null,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        startedAt: r.started_at || null,
        completedAt: r.completed_at || null,
    };

    const stages = stagesResult.rows.map((s) => ({
        id: s.id,
        name: s.name,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        moduleCount: Number(s.module_count) || 0,
    }));

    const modules = modulesResult.rows.map((m) => ({
        id: m.id,
        name: m.name,
        stageName: m.stage_name || null,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
    }));

    const stat = statsResult.rows[0];
    const responseStats = {
        total: Number(stat?.total) || 0,
        uniqueParticipants: Number(stat?.unique_participants) || 0,
        firstResponse: stat?.first_response || null,
        lastResponse: stat?.last_response || null,
    };

    // Build timeline
    const timeline: TimelineEvent[] = [];

    timeline.push({ type: 'research_created', date: research.createdAt, label: `Research "${research.name}" created` });

    if (research.startedAt) {
        timeline.push({ type: 'research_started', date: research.startedAt, label: 'Research activated' });
    }
    if (research.completedAt) {
        timeline.push({ type: 'research_completed', date: research.completedAt, label: 'Research completed' });
    }

    for (const stage of stages) {
        timeline.push({ type: 'stage_added', date: stage.createdAt, label: `Stage "${stage.name}" added` });
    }

    for (const mod of modules) {
        timeline.push({ type: 'module_added', date: mod.createdAt, label: `Module "${mod.name}" added${mod.stageName ? ` to ${mod.stageName}` : ''}` });
        if (mod.updatedAt && mod.updatedAt !== mod.createdAt) {
            timeline.push({ type: 'module_updated', date: mod.updatedAt, label: `Module "${mod.name}" updated` });
        }
    }

    if (responseStats.firstResponse) {
        timeline.push({ type: 'first_response', date: responseStats.firstResponse, label: 'First participant response received' });
    }
    if (responseStats.lastResponse && responseStats.lastResponse !== responseStats.firstResponse) {
        timeline.push({ type: 'last_response', date: responseStats.lastResponse, label: `Last response received (${responseStats.total} total)` });
    }

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { research, stages, modules, responseStats, timeline };
};

// No-op: no longer writes to a dedicated table
export const logResearchActivity = async (): Promise<void> => {
    // Activity is derived from existing tables, no write needed
};
