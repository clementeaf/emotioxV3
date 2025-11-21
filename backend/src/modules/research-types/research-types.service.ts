import pool from '../../config/database';

export interface ResearchTypeData {
    name: string;
    description?: string;
    default_modules?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
}

export const list = async () => {
    const query = `
    SELECT id, name, description, default_modules, settings, is_active, created_at
    FROM research_types
    WHERE is_active = true
    ORDER BY name
  `;
    const result = await pool.query(query);
    return result.rows;
};

export const create = async (data: ResearchTypeData, createdBy: string) => {
    const { name, description, default_modules = [], settings = {} } = data;

    const query = `
    INSERT INTO research_types (name, description, default_modules, settings, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, name, description, default_modules, settings, is_active, created_at
  `;
    const result = await pool.query(query, [
        name,
        description,
        JSON.stringify(default_modules),
        JSON.stringify(settings),
        createdBy,
    ]);
    return result.rows[0];
};

export const getById = async (id: string) => {
    const query = `
    SELECT id, name, description, default_modules, settings, is_active, created_at, updated_at
    FROM research_types
    WHERE id = $1
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Research type not found');
    }

    return result.rows[0];
};

export const update = async (id: string, data: Partial<ResearchTypeData>) => {
    const { name, description, default_modules, settings } = data;

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
    RETURNING id, name, description, default_modules, settings, is_active, updated_at
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
