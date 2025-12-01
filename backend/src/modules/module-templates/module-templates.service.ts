import pool from '../../config/database';
import cache, { CacheKeys, CacheTTL } from '../../config/cache';

export interface ModuleTemplateData {
    name: string;
    description?: string;
    structure?: any[];
    created_by: string | null;
}

export const list = async () => {
    return cache.getOrSet(
        CacheKeys.MODULE_TEMPLATES_LIST,
        async () => {
            const query = `
            SELECT id, name, description, structure, created_by, is_active, created_at, updated_at
            FROM module_templates
            WHERE is_active = true
            ORDER BY created_at DESC
          `;
            const result = await pool.query(query);
            return result.rows;
        },
        CacheTTL.LONG // Cache for 15 minutes
    );
};

export const create = async (data: ModuleTemplateData) => {
    const { name, description, structure = [], created_by } = data;

    const query = `
    INSERT INTO module_templates (name, description, structure, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, description, structure, created_by, is_active, created_at
  `;

    const result = await pool.query(query, [
        name,
        description,
        JSON.stringify(structure),
        created_by
    ]);
    
    // Invalidate cache
    cache.delete(CacheKeys.MODULE_TEMPLATES_LIST);

    return result.rows[0];
};

export const getById = async (id: string) => {
    const cacheKey = `${CacheKeys.MODULE_TEMPLATE}:${id}`;
    
    return cache.getOrSet(
        cacheKey,
        async () => {
            const query = `
            SELECT id, name, description, structure, created_by, is_active, created_at, updated_at
            FROM module_templates
            WHERE id = $1 AND is_active = true
          `;
            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new Error('Module template not found');
            }

            return result.rows[0];
        },
        CacheTTL.LONG
    );
};

export const update = async (id: string, data: Partial<ModuleTemplateData>) => {
    const { name, description, structure } = data;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
    }
    if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
    }
    if (structure !== undefined) {
        updates.push(`structure = $${paramIndex++}`);
        values.push(JSON.stringify(structure));
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
    UPDATE module_templates
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex} AND is_active = true
    RETURNING id, name, description, structure, is_active, updated_at
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Module template not found');
    }
    
    // Invalidate cache
    cache.delete(CacheKeys.MODULE_TEMPLATES_LIST);
    cache.delete(`${CacheKeys.MODULE_TEMPLATE}:${id}`);

    return result.rows[0];
};

export const deleteTemplate = async (id: string) => {
    const query = `
    UPDATE module_templates
    SET is_active = false
    WHERE id = $1
    RETURNING id
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Module template not found');
    }
    
    // Invalidate cache
    cache.delete(CacheKeys.MODULE_TEMPLATES_LIST);
    cache.delete(`${CacheKeys.MODULE_TEMPLATE}:${id}`);

    return { message: 'Module template deleted successfully' };
};

export const getUsage = async (id: string) => {
    try {
        // First check if the template exists
        const templateQuery = `
            SELECT id FROM module_templates
            WHERE id = $1 AND is_active = true
        `;
        const templateResult = await pool.query(templateQuery, [id]);
        
        if (templateResult.rows.length === 0) {
            throw new Error('Module template not found');
        }

        // Find all researches that use this module template
        // Since modules are cloned from templates (not referenced), we look for:
        // Modules in researches that have is_from_template = true and match the template
        // Simplified query to avoid complex JOINs that might fail
        const usageQuery = `
            SELECT DISTINCT r.id, r.name, r.created_at
            FROM researches r
            INNER JOIN stages s ON r.id = s.research_id AND r.deleted_at IS NULL
            INNER JOIN modules m ON s.id = m.stage_id AND m.is_from_template = true
            WHERE EXISTS (
                SELECT 1 
                FROM stage_templates st
                INNER JOIN stage_templates_module_templates stmt ON st.id = stmt.stage_template_id
                WHERE st.name = s.name 
                  AND stmt.module_template_id = $1
            )
            ORDER BY r.created_at DESC
        `;
        
        const result = await pool.query(usageQuery, [id]);
        
        return {
            count: result.rows.length,
            researches: result.rows.map(row => ({
                id: row.id,
                name: row.name
            }))
        };
    } catch (error: unknown) {
        // Log the error for debugging
        console.error('Error in getUsage for template', id, ':', error);
        // Return empty result instead of throwing to prevent 500 errors
        // This allows the frontend to continue working even if usage query fails
        return {
            count: 0,
            researches: []
        };
    }
};
