import pool from '../../config/database';

export interface EnterpriseData {
    name: string;
    description?: string;
}

export const list = async () => {
    const query = `
    SELECT id, name, description, created_by, is_active, created_at, updated_at
    FROM enterprises
    WHERE is_active = true
    ORDER BY name
  `;
    const result = await pool.query(query);
    return result.rows;
};

export const getById = async (id: string) => {
    const query = `
    SELECT id, name, description, created_by, is_active, created_at, updated_at
    FROM enterprises
    WHERE id = $1
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Enterprise not found');
    }

    return result.rows[0];
};

export const create = async (data: EnterpriseData, createdBy: string) => {
    const { name, description } = data;

    const query = `
    INSERT INTO enterprises (name, description, created_by)
    VALUES ($1, $2, $3)
    RETURNING id, name, description, created_by, is_active, created_at, updated_at
  `;
    const result = await pool.query(query, [name, description, createdBy]);
    return result.rows[0];
};

export const update = async (id: string, data: Partial<EnterpriseData>) => {
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
    UPDATE enterprises
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, description, created_by, is_active, updated_at
  `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Enterprise not found');
    }

    return result.rows[0];
};

export const deleteEnterprise = async (id: string) => {
    const query = `
    UPDATE enterprises
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Enterprise not found');
    }

    return { message: 'Enterprise deleted successfully' };
};

