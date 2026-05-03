import pool from '../../config/database';
import { buildOwnershipClause } from './research.helpers';

export interface ResearchTag {
    id: string;
    researchId: string;
    tag: string;
    createdAt: string;
}

export const getTagsForResearch = async (researchId: string): Promise<string[]> => {
    const result = await pool.query(
        'SELECT tag FROM research_tags WHERE research_id = ? ORDER BY tag ASC',
        [researchId]
    );
    return result.rows.map((r) => (r as { tag: string }).tag);
};

export const getAllTags = async (userId: string, role?: string): Promise<string[]> => {
    const { clause, params } = buildOwnershipClause(userId, role);
    const result = await pool.query(
        `SELECT DISTINCT rt.tag
         FROM research_tags rt
         JOIN researches r ON r.id = rt.research_id
         WHERE r.deleted_at IS NULL AND ${clause}
         ORDER BY rt.tag ASC`,
        params
    );
    return result.rows.map((r) => (r as { tag: string }).tag);
};

export const addTag = async (researchId: string, tag: string): Promise<void> => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    await pool.query(
        'INSERT IGNORE INTO research_tags (research_id, tag) VALUES (?, ?)',
        [researchId, trimmed]
    );
};

export const removeTag = async (researchId: string, tag: string): Promise<void> => {
    await pool.query(
        'DELETE FROM research_tags WHERE research_id = ? AND tag = ?',
        [researchId, tag.trim().toLowerCase()]
    );
};

export const archiveResearch = async (researchId: string): Promise<void> => {
    await pool.query(
        'UPDATE researches SET archived_at = NOW() WHERE id = ? AND archived_at IS NULL',
        [researchId]
    );
};

export const unarchiveResearch = async (researchId: string): Promise<void> => {
    await pool.query(
        'UPDATE researches SET archived_at = NULL WHERE id = ?',
        [researchId]
    );
};
