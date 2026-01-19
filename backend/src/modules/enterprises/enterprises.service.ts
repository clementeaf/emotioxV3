import pool from '../../config/database';

export interface EnterpriseData {
    name: string;
    description?: string;
}

export const list = async () => {
    const query = `
    SELECT id, name, description, created_at, updated_at
    FROM enterprises
    ORDER BY name
  `;
    const result = await pool.query(query);
    return result.rows;
};

export const getById = async (id: string) => {
    const query = `
    SELECT id, name, description, created_at, updated_at
    FROM enterprises
    WHERE id = ?
  `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
        throw new Error('Enterprise not found');
    }

    return result.rows[0];
};

export const create = async (data: EnterpriseData, createdBy: string) => {
    const { name, description } = data;

    // MySQL compatible: pre-generate UUID and no RETURNING
    const enterpriseId = crypto.randomUUID();
    const query = `
    INSERT INTO enterprises (id, name, description)
    VALUES (?, ?, ?)
  `;
    await pool.query(query, [enterpriseId, name, description]);
    
    // Fetch created record
    const selectResult = await pool.query(
        'SELECT id, name, description, created_at, updated_at FROM enterprises WHERE id = ?',
        [enterpriseId]
    );
    return selectResult.rows[0];
};

export const update = async (id: string, data: Partial<EnterpriseData>) => {
    const { name, description } = data;

    // MySQL compatible: use ? placeholders
    const updates: string[] = [];
    const values: unknown[] = [];

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

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `
    UPDATE enterprises
    SET ${updates.join(', ')}
    WHERE id = ?
  `;

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
        throw new Error('Enterprise not found');
    }

    // Fetch updated record (MySQL doesn't support RETURNING)
    const selectResult = await pool.query(
        'SELECT id, name, description, created_at, updated_at FROM enterprises WHERE id = ?',
        [id]
    );
    return selectResult.rows[0];
};

export const deleteEnterprise = async (id: string) => {
    // MySQL compatible: no RETURNING clause, no is_active column in current schema
    const query = `
    DELETE FROM enterprises
    WHERE id = ?
  `;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
        throw new Error('Enterprise not found');
    }

    return { message: 'Enterprise deleted successfully' };
};

