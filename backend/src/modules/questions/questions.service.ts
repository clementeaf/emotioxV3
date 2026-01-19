import pool from '../../config/database';

export const create = async (moduleId: string, data: Record<string, unknown>) => {
    const { question_text, type, order_index, config = {}, validation = {}, required = false } = data;

    const ALLOWED_TYPES = ['text', 'textarea', 'range', 'image_preference', 'image_hitzone', 'checkbox', 'radio'];
    if (typeof type !== 'string' || !ALLOWED_TYPES.includes(type)) {
        throw new Error(`Invalid question type. Allowed: ${ALLOWED_TYPES.join(', ')}`);
    }

    // MySQL compatible: pre-generate UUID and no RETURNING
    const questionId = crypto.randomUUID();
    const query = `
    INSERT INTO questions (id, module_id, question_text, question_type, order_index, config, validation, required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const values = [
        questionId,
        moduleId,
        question_text,
        type,
        order_index || 0,
        JSON.stringify(config),
        JSON.stringify(validation),
        required
    ];

    await pool.query(query, values);
    
    // Fetch created record
    const selectResult = await pool.query('SELECT * FROM questions WHERE id = ?', [questionId]);
    return selectResult.rows[0];
};

export const update = async (questionId: string, data: Record<string, unknown>) => {
    const { question_text, type, config, validation, required } = data;
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // MySQL compatible: use ? placeholders
    if (type !== undefined) {
        updates.push('question_type = ?');
        values.push(type);
    }
    if (question_text !== undefined) {
        updates.push('question_text = ?');
        values.push(question_text);
    }
    if (config !== undefined) {
        updates.push('config = ?');
        values.push(JSON.stringify(config));
    }
    if (validation !== undefined) {
        updates.push('validation = ?');
        values.push(JSON.stringify(validation));
    }
    if (required !== undefined) {
        updates.push('required = ?');
        values.push(required);
    }

    if (updates.length === 0) throw new Error('No fields to update');

    values.push(questionId);
    const query = `UPDATE questions SET ${updates.join(', ')} WHERE id = ?`;
    const result = await pool.query(query, values);
    if (result.rowCount === 0) throw new Error('Question not found');
    
    // Fetch updated record (MySQL doesn't support RETURNING)
    const selectResult = await pool.query('SELECT * FROM questions WHERE id = ?', [questionId]);
    return selectResult.rows[0];
};

export const deleteQuestion = async (questionId: string) => {
    // MySQL compatible: no RETURNING clause
    const query = `DELETE FROM questions WHERE id = ?`;
    const result = await pool.query(query, [questionId]);
    if (result.rowCount === 0) throw new Error('Question not found');
    return { message: 'Question deleted successfully' };
};

export const reorder = async (moduleId: string, questionOrders: { id: string; order: number }[]) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const { id, order } of questionOrders) {
            await client.query('UPDATE questions SET order_index = ? WHERE id = ? AND module_id = ?', [order, id, moduleId]);
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
