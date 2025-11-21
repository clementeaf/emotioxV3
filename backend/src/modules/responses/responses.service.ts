import pool from '../../config/database';

export const save = async (researchId: string, participantId: string, moduleId: string, questionId: string, answer: unknown, metadata: Record<string, unknown> = {}) => {
  const query = `
    INSERT INTO responses (research_id, participant_id, module_id, question_id, answer, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await pool.query(query, [
    researchId,
    participantId,
    moduleId,
    questionId,
    JSON.stringify(answer),
    JSON.stringify(metadata),
  ]);
  return result.rows[0];
};

export const getByResearch = async (researchId: string) => {
  const query = `
    SELECT r.*, q.question_type, q.question_text, m.name as module_name
    FROM responses r
    JOIN questions q ON r.question_id = q.id
    JOIN modules m ON r.module_id = m.id
    WHERE r.research_id = $1
    ORDER BY r.created_at DESC
  `;
  const result = await pool.query(query, [researchId]);
  return result.rows;
};

export const getByParticipant = async (researchId: string, participantId: string) => {
  const query = `
    SELECT r.*, q.question_type, q.question_text, m.name as module_name
    FROM responses r
    JOIN questions q ON r.question_id = q.id
    JOIN modules m ON r.module_id = m.id
    WHERE r.research_id = $1 AND r.participant_id = $2
    ORDER BY r.created_at ASC
  `;
  const result = await pool.query(query, [researchId, participantId]);
  return result.rows;
};
