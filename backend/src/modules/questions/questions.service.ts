import pool from '../../config/database';

export const create = async (moduleId: string, data: Record<string, unknown>) => {
    const { question_text, type, order_index, config = {}, validation = {}, required = false } = data;

    const ALLOWED_TYPES = ['text', 'textarea', 'range', 'image_preference', 'image_hitzone', 'checkbox', 'radio'];
    if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type)) {
        throw new Error(`Invalid question type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    const query = `
    INSERT INTO questions (module_id, question_text, type, order_index, config, validation, required)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
    const values = [
        moduleId,
        question_text,
        type,
        order_index || 0,
        config,
        validation,
        required
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const update = async (questionId: string, data: Record<string, unknown>) => {
    const { question_text, type, config, validation, required } = data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(type);
    }
    if (question_text !== undefined) {
        updates.push(`question_text = $${paramIndex++}`);
        values.push(question_text);
    }
    if (config !== undefined) {
        updates.push(`config = $${paramIndex++}`);
        values.push(config);
    }
    if (validation !== undefined) {
        updates.push(`validation = $${paramIndex++}`);
        values.push(validation);
    }
    if (required !== undefined) {
        updates.push(`required = $${paramIndex++}`);
        values.push(required);
    }

    if (updates.length === 0) throw new Error('No fields to update');

    values.push(questionId);
    const query = `UPDATE questions SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    if (result.rows.length === 0) throw new Error('Question not found');
    return result.rows[0];
};

export const deleteQuestion = async (questionId: string) => {
    const query = `DELETE FROM questions WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [questionId]);
    if (result.rows.length === 0) throw new Error('Question not found');
    return { message: 'Question deleted successfully' };
};

export const reorder = async (moduleId: string, questionOrders: { id: string; order: number }[]) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const { id, order } of questionOrders) {
            await client.query('UPDATE questions SET order_index = $1 WHERE id = $2 AND module_id = $3', [order, id, moduleId]);
        }
        await client.query('COMMIT');
        return { message: 'Questions reordered successfully' };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};
