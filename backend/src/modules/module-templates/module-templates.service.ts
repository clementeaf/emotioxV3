import pool from '../../config/database';

export interface ModuleTemplateData {
    name: string;
    description?: string;
    structure?: any[];
    created_by: string;
}

export const list = async () => {
    const query = `
    SELECT id, name, description, structure, created_by, is_active, created_at, updated_at
    FROM module_templates
    WHERE is_active = true
    ORDER BY created_at DESC
  `;
    const result = await pool.query(query);
    return result.rows;
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

    return result.rows[0];
};

export const getById = async (id: string) => {
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

    return { message: 'Module template deleted successfully' };
};
