import pool from '../../config/database';

export const create = async (researchId: string, data: any) => {
    const { name, description, order_index, config = {} } = data;

    // Check if research exists and is not deleted
    const researchCheck = await pool.query('SELECT id FROM researches WHERE id = $1 AND deleted_at IS NULL', [researchId]);
    if (researchCheck.rows.length === 0) {
        throw new Error('Research not found or deleted');
    }

    const query = `
    INSERT INTO modules (research_id, name, description, order_index, config)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, research_id, name, description, order_index, is_from_template, config, created_at
  `;
    const result = await pool.query(query, [researchId, name, description, order_index, JSON.stringify(config)]);
    return result.rows[0];
};

export const update = async (moduleId: string, data: any) => {
    const { name, description, config } = data;
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
    if (config !== undefined) {
        updates.push(`config = $${paramIndex++}`);
        values.push(JSON.stringify(config));
    }

    if (updates.length === 0) throw new Error('No fields to update');

    values.push(moduleId);
    const query = `UPDATE modules SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) throw new Error('Module not found');
    return result.rows[0];
};

export const deleteModule = async (moduleId: string) => {
    const query = `DELETE FROM modules WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [moduleId]);
    if (result.rows.length === 0) throw new Error('Module not found');
    return { message: 'Module deleted successfully' };
};

export const reorder = async (researchId: string, moduleOrders: { id: string; order: number }[]) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const { id, order } of moduleOrders) {
            await client.query('UPDATE modules SET order_index = $1 WHERE id = $2 AND research_id = $3', [order, id, researchId]);
        }
        await client.query('COMMIT');
        return { message: 'Modules reordered successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
