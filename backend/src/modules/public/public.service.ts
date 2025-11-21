import pool from '../../config/database';

export const getResearch = async (researchId: string) => {
  // Check if research is active
  const researchQuery = `
    SELECT id, name, description, status
    FROM researches
    WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
  `;
  const researchResult = await pool.query(researchQuery, [researchId]);

  if (researchResult.rows.length === 0) {
    throw new Error('Research not found or not active');
  }

  const research = researchResult.rows[0];

  // Get modules with questions
  const modulesQuery = `
    SELECT m.id, m.name, m.description, m.order_index,
           json_agg(
             json_build_object(
               'id', q.id,
               'type', q.question_type,
               'text', q.question_text,
               'order', q.order_index,
               'config', q.config,
               'required', q.required
             ) ORDER BY q.order_index
           ) FILTER (WHERE q.id IS NOT NULL) as questions
    FROM modules m
    LEFT JOIN questions q ON m.id = q.module_id
    WHERE m.research_id = $1
    GROUP BY m.id
    ORDER BY m.order_index
  `;
  const modulesResult = await pool.query(modulesQuery, [researchId]);

  research.modules = modulesResult.rows;

  return research;
};

export const saveResponse = async (data: Record<string, unknown>) => {
  const { research_id, participant_id, module_id, question_id, answer, metadata = {} } = data;

  const query = `
    INSERT INTO responses (research_id, participant_id, module_id, question_id, answer, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at
  `;
  const result = await pool.query(query, [
    research_id,
    participant_id,
    module_id,
    question_id,
    JSON.stringify(answer),
    JSON.stringify(metadata),
  ]);
  return result.rows[0];
};
