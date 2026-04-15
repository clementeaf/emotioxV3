import pool from '../../config/database';

export interface ResearchActivityLogInput {
    researchId: string;
    actorUserId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
}

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

export const logResearchActivity = async (input: ResearchActivityLogInput): Promise<void> => {
    try {
        const activityId = crypto.randomUUID();
        await pool.query(
            `INSERT INTO research_activity_logs
             (id, research_id, actor_user_id, action, entity_type, entity_id, summary, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                activityId,
                input.researchId,
                input.actorUserId || null,
                input.action,
                input.entityType,
                input.entityId || null,
                input.summary,
                JSON.stringify(input.metadata || {}),
            ]
        );
    } catch (error) {
        console.error('[ResearchActivity] Failed to write activity log:', error);
    }
};

export const listResearchActivity = async (researchId: string): Promise<ResearchActivityLog[]> => {
    const result = await pool.query(
        `SELECT
            ral.id,
            ral.research_id,
            r.name as research_name,
            rt.name as research_technique_name,
            ral.actor_user_id,
            ral.action,
            ral.entity_type,
            ral.entity_id,
            ral.summary,
            ral.metadata,
            ral.created_at,
            u.first_name,
            u.last_name,
            u.email
         FROM research_activity_logs ral
         JOIN researches r ON r.id = ral.research_id
         LEFT JOIN research_techniques rt ON rt.id = r.research_technique_id
         LEFT JOIN users u ON u.id = ral.actor_user_id
         WHERE ral.research_id = ?
         ORDER BY ral.created_at DESC`,
        [researchId]
    );

    return result.rows.map((row) => {
        let metadata = row.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch {
                metadata = {};
            }
        }

        const actorName = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;

        return {
            id: row.id,
            researchId: row.research_id,
            researchName: row.research_name || null,
            researchTechniqueName: row.research_technique_name || null,
            actorUserId: row.actor_user_id || null,
            actorName,
            actorEmail: row.email || null,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id || null,
            summary: row.summary,
            metadata: (metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}) as Record<string, unknown>,
            createdAt: row.created_at,
        };
    });
};

export const listAllResearchActivity = async (): Promise<ResearchActivityLog[]> => {
    const result = await pool.query(
        `SELECT
            ral.id,
            ral.research_id,
            r.name as research_name,
            rt.name as research_technique_name,
            ral.actor_user_id,
            ral.action,
            ral.entity_type,
            ral.entity_id,
            ral.summary,
            ral.metadata,
            ral.created_at,
            u.first_name,
            u.last_name,
            u.email
         FROM research_activity_logs ral
         JOIN researches r ON r.id = ral.research_id
         LEFT JOIN research_techniques rt ON rt.id = r.research_technique_id
         LEFT JOIN users u ON u.id = ral.actor_user_id
         ORDER BY ral.created_at DESC`
    );

    return result.rows.map((row) => {
        let metadata = row.metadata;
        if (typeof metadata === 'string') {
            try {
                metadata = JSON.parse(metadata);
            } catch {
                metadata = {};
            }
        }

        const actorName = [row.first_name, row.last_name].filter(Boolean).join(' ') || null;

        return {
            id: row.id,
            researchId: row.research_id,
            researchName: row.research_name || null,
            researchTechniqueName: row.research_technique_name || null,
            actorUserId: row.actor_user_id || null,
            actorName,
            actorEmail: row.email || null,
            action: row.action,
            entityType: row.entity_type,
            entityId: row.entity_id || null,
            summary: row.summary,
            metadata: (metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {}) as Record<string, unknown>,
            createdAt: row.created_at,
        };
    });
};
