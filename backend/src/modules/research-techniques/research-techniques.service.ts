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
            SELECT id, name, description, created_by, is_active, created_at, updated_at
            FROM research_techniques
            WHERE is_active = true
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
            SELECT id, name, description, created_by, is_active, created_at, updated_at
            FROM research_techniques
            WHERE id = $1
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

    const query = `
    INSERT INTO research_techniques (name, description, created_by)
    VALUES ($1, $2, $3)
    RETURNING id, name, description, created_by, is_active, created_at, updated_at
  `;
    const result = await pool.query(query, [name, description, createdBy]);
    
    // Invalidate cache
    cache.delete(CacheKeys.RESEARCH_TECHNIQUES_LIST);
    
    return result.rows[0];
};

export const update = async (id: string, data: Partial<ResearchTechniqueData>) => {
    const { name, description } = data;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
    UPDATE research_techniques
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, description, created_by, is_active, updated_at
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Research technique not found');
    }

    return result.rows[0];
};

export const deleteResearchTechnique = async (id: string) => {
    const query = `
    UPDATE research_techniques
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Research technique not found');
    }

    return { message: 'Research technique deleted successfully' };
};

