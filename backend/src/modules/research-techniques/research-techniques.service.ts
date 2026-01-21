import pool from '../../config/database';
import cache, { CacheKeys, CacheTTL } from '../../config/cache';

export interface ResearchTechniqueData {
    name: string;
    description: string;
}

export const list = async () => {
    return cache.getOrSet(
        CacheKeys.RESEARCH_TECHNIQUES_LIST,
        async () => {
            const query = `
            SELECT id, name, description, created_at, updated_at
            FROM research_techniques
            ORDER BY name
          `;
            const result = await pool.query(query);
            return result.rows;
        },
        CacheTTL.LONG // Cache for 15 minutes
    );
};

export const getById = async (id: string) => {
    const cacheKey = `${CacheKeys.RESEARCH_TECHNIQUE}:${id}`;
    
    return cache.getOrSet(
        cacheKey,
        async () => {
            const query = `
            SELECT id, name, description, created_at, updated_at
            FROM research_techniques
            WHERE id = ?
          `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new Error('Research technique not found');
            }

            return result.rows[0];
        },
        CacheTTL.LONG
    );
};

export const create = async (data: ResearchTechniqueData, createdBy: string) => {
    const { name, description } = data;

    // MySQL compatible: pre-generate UUID and no RETURNING
    const techniqueId = crypto.randomUUID();
    const query = `
    INSERT INTO research_techniques (id, name, description)
    VALUES (?, ?, ?)
  `;
    await pool.query(query, [techniqueId, name, description]);
    
    // Invalidate cache
    cache.delete(CacheKeys.RESEARCH_TECHNIQUES_LIST);
    
    // Fetch created record
    const selectResult = await pool.query(
        'SELECT id, name, description, created_at, updated_at FROM research_techniques WHERE id = ?',
        [techniqueId]
    );
    return selectResult.rows[0];
};

export const update = async (id: string, data: Partial<ResearchTechniqueData>) => {
    const { name, description } = data;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // MySQL compatible: use ? placeholders
    if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query = `
    UPDATE research_techniques
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
        throw new Error('Research technique not found');
    }

    // Fetch updated record (MySQL doesn't support RETURNING)
    const selectResult = await pool.query(
        'SELECT id, name, description, created_at, updated_at FROM research_techniques WHERE id = ?',
        [id]
    );
    return selectResult.rows[0];
};

export const deleteResearchTechnique = async (id: string) => {
    // MySQL compatible: no RETURNING clause, no is_active column in current schema
    const query = `
    DELETE FROM research_techniques
    WHERE id = ?
  `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
        throw new Error('Research technique not found');
    }

    // Invalidate cache
    cache.delete(CacheKeys.RESEARCH_TECHNIQUES_LIST);
    cache.delete(`${CacheKeys.RESEARCH_TECHNIQUE}:${id}`);

    return { message: 'Research technique deleted successfully' };
};

