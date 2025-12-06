import pool from '../../config/database';
import cache, { CacheKeys, CacheTTL } from '../../config/cache';

export const getResearch = async (researchId: string) => {
  const cacheKey = `${CacheKeys.PUBLIC_RESEARCH}:${researchId}`;
  
  return cache.getOrSet(
    cacheKey,
    async () => {
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
    },
    CacheTTL.SHORT // Cache for 1 minute (frequently changing)
  );
};

export const saveResponse = async (data: Record<string, unknown>) => {
  const { research_id, participant_id, module_id, question_id, answer, metadata = {} } = data;

  // Validate that participantId is present and not empty
  // This prevents preview mode responses from being saved
  if (!participant_id || typeof participant_id !== 'string' || participant_id.trim() === '') {
    throw new Error('participant_id is required. Preview mode responses are not saved.');
  }

  const query = `
    INSERT INTO responses (research_id, participant_id, module_id, question_id, value, metadata)
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

interface ParticipantResponsePayload {
  participantId: string;
  moduleId: string;
  responses: Array<{
    moduleId: string;
    componentId: string;
    value: unknown;
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Save participant responses for a module
 * This is the modern endpoint for saving responses from participant-frontend
 */
export const saveParticipantResponses = async (
  researchId: string,
  payload: ParticipantResponsePayload
) => {
  const { participantId, moduleId, responses, metadata = {} } = payload;

  // Validate that participantId is present and not empty
  // This prevents preview mode responses from being saved
  if (!participantId || typeof participantId !== 'string' || participantId.trim() === '') {
    throw new Error('participantId is required. Preview mode responses are not saved.');
  }

  // Validate research exists and is active
  const researchQuery = `
    SELECT id FROM researches
    WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
  `;
  const researchResult = await pool.query(researchQuery, [researchId]);
  if (researchResult.rows.length === 0) {
    throw new Error('Research not found or not active');
  }

  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const savedResponses = [];

    // Insert each response
    for (const response of responses) {
      const query = `
        INSERT INTO responses (
          research_id,
          participant_id,
          module_id,
          component_id,
          value,
          metadata,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (research_id, participant_id, module_id, component_id)
        DO UPDATE SET
          value = EXCLUDED.value,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id, created_at, updated_at
      `;

      const result = await client.query(query, [
        researchId,
        participantId,
        response.moduleId,
        response.componentId,
        // value can be already stringified (from NavigationFlow/PreferenceTest) or raw value
        typeof response.value === 'string' ? response.value : JSON.stringify(response.value),
        JSON.stringify({ ...response.metadata, moduleMetadata: metadata }),
      ]);

      savedResponses.push(result.rows[0]);
    }

    await client.query('COMMIT');

    console.log(`✓ Saved ${savedResponses.length} responses for participant ${participantId}`);

    return {
      success: true,
      message: `Saved ${savedResponses.length} responses`,
      count: savedResponses.length,
      responseIds: savedResponses.map(r => r.id),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving participant responses:', error);
    throw error;
  } finally {
    client.release();
  }
};
