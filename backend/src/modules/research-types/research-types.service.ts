import pool from '../../config/database';

export interface ResearchTypeData {
    name: string;
    description?: string;
    research_technique_id?: string;
    default_modules?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
}

export const list = async () => {
    // Only return research types that have at least one technique associated in the junction table
    const query = `
    SELECT DISTINCT
        rt.id, 
        rt.name, 
        rt.description, 
        rt.default_modules, 
        rt.settings, 
        rt.is_active, 
        rt.created_at
    FROM research_types rt
    INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_type_id
    INNER JOIN research_techniques tech ON rtt.research_technique_id = tech.id
    WHERE rt.is_active = true AND tech.is_active = true
    ORDER BY rt.name
  `;
    const result = await pool.query(query);
    return result.rows;
};

export const create = async (data: ResearchTypeData, createdBy: string | null) => {
    const { name, description, research_technique_id, default_modules = [], settings = {} } = data;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create research type
        const query = `
            INSERT INTO research_types (name, description, research_technique_id, default_modules, settings, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, description, research_technique_id, default_modules, settings, is_active, created_at
        `;
        const result = await client.query(query, [
            name,
            description,
            research_technique_id || null,
            JSON.stringify(default_modules),
            JSON.stringify(settings),
            createdBy,
        ]);

        const researchType = result.rows[0];

        // If a research technique is provided, associate it in the junction table
        if (research_technique_id) {
            const junctionQuery = `
                INSERT INTO research_types_techniques (research_type_id, research_technique_id)
                VALUES ($1, $2)
                ON CONFLICT (research_type_id, research_technique_id) DO NOTHING
            `;
            await client.query(junctionQuery, [researchType.id, research_technique_id]);
        }

        await client.query('COMMIT');
        return researchType;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

export const getById = async (id: string) => {
    const query = `
    SELECT 
        rt.id, 
        rt.name, 
        rt.description, 
        rt.research_technique_id,
        rt.default_modules, 
        rt.settings, 
        rt.is_active, 
        rt.created_at, 
        rt.updated_at,
        rt2.name as research_technique_name,
        rt2.description as research_technique_description
    FROM research_types rt
    LEFT JOIN research_techniques rt2 ON rt.research_technique_id = rt2.id
    WHERE rt.id = $1
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return result.rows[0];
};

export const update = async (id: string, data: Partial<ResearchTypeData>) => {
    const { name, description, research_technique_id, default_modules, settings } = data;

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
    if (research_technique_id !== undefined) {
        updates.push(`research_technique_id = $${paramIndex++}`);
        values.push(research_technique_id || null);
    }
    if (default_modules !== undefined) {
        updates.push(`default_modules = $${paramIndex++}`);
        values.push(JSON.stringify(default_modules));
    }
    if (settings !== undefined) {
        updates.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(settings));
    }

    if (updates.length === 0) {
        throw new Error('No fields to update');
    }

    values.push(id);

    const query = `
    UPDATE research_types
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, description, research_technique_id, default_modules, settings, is_active, updated_at
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return result.rows[0];
};

export const deleteResearchType = async (id: string) => {
    const query = `
    UPDATE research_types
    SET is_active = false
    WHERE id = $1
    RETURNING id
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return { message: 'Research type deleted successfully' };
};

export const updateModules = async (id: string, modules: Record<string, unknown>[]) => {
    const query = `
    UPDATE research_types
    SET default_modules = $1
    WHERE id = $2
    RETURNING id, name, default_modules, updated_at
  `;
    const result = await pool.query(query, [JSON.stringify(modules), id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return result.rows[0];
};

/**
 * Gets all research techniques associated with a research type
 * @param researchTypeId - ID of the research type
 * @returns Array of research techniques
 */
export const getTechniquesByType = async (researchTypeId: string) => {
    const query = `
    SELECT 
        rt.id,
        rt.name,
        rt.description,
        rt.created_by,
        rt.is_active,
        rt.created_at,
        rt.updated_at
    FROM research_techniques rt
    INNER JOIN research_types_techniques rtt ON rt.id = rtt.research_technique_id
    WHERE rtt.research_type_id = $1 AND rt.is_active = true
    ORDER BY rt.name
  `;
    const result = await pool.query(query, [researchTypeId]);
    return result.rows;
};
