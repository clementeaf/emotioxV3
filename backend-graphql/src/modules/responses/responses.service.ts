import pool from '../../config/database';

export const save = async (researchId: string, participantId: string, moduleId: string, questionId: string, answer: unknown, metadata: Record<string, unknown> = {}) => {
  const query = `
    INSERT INTO responses (research_id, participant_id, module_id, question_id, value, metadata)
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
  /* 
    Logic to trigger real-time updates via WebSocket.
    We fetch the updated metrics (using internal method to bypass user check) and send them to connected clients.
  */
  try {
    // Import dynamically to avoid circular dependencies if any
    const { monitorService } = await import('../monitor/monitor.service');
    const { getOverviewMetricsInternal, getParticipantsWithStatusInternal } = await import('../research/research-in-progress.service');

    // Determine endpoint
    const isOffline = process.env.IS_OFFLINE || process.env.IS_LOCAL;
    // Default local endpoint for serverless-offline
    let endpoint = 'http://localhost:3001';

    if (!isOffline && process.env.WEBSOCKET_API_ENDPOINT) {
      endpoint = process.env.WEBSOCKET_API_ENDPOINT;
    }

    // Fetch updated data
    const [metrics, participants] = await Promise.all([
      getOverviewMetricsInternal(researchId),
      getParticipantsWithStatusInternal(researchId)
    ]);

    const payload = {
      type: 'RESEARCH_UPDATE',
      data: {
        metrics,
        participants
      }
    };

    // Fire and forget - don't block response saving
    monitorService.notifyResearchUpdate(researchId, payload, endpoint).catch(err => {
      console.error('Failed to send WebSocket update:', err);
    });

  } catch (err) {
    console.error('Error triggering research update:', err);
  }

  return result.rows[0];
};

export const getByResearch = async (researchId: string) => {
  const query = `
    SELECT 
      r.id,
      r.research_id,
      r.participant_id,
      r.module_id,
      r.question_id,
      r.component_id,
      r.value as response_value,
      r.value,
      r.metadata,
      r.created_at,
      r.updated_at,
      q.question_type,
      q.question_text,
      m.name as module_name
    FROM responses r
    LEFT JOIN questions q ON r.question_id = q.id
    LEFT JOIN modules m ON r.module_id = m.id
    WHERE r.research_id = $1
    ORDER BY r.created_at DESC
  `;
  const result = await pool.query(query, [researchId]);
  return result.rows;
};

export const getByParticipant = async (researchId: string, participantId: string) => {
  const query = `
    SELECT 
      r.id,
      r.research_id,
      r.participant_id,
      r.module_id,
      r.question_id,
      r.component_id,
      r.value as response_value,
      r.value,
      r.metadata,
      r.created_at,
      r.updated_at,
      q.question_type,
      q.question_text,
      m.name as module_name
    FROM responses r
    LEFT JOIN questions q ON r.question_id = q.id
    LEFT JOIN modules m ON r.module_id = m.id
    WHERE r.research_id = $1 AND r.participant_id = $2
    ORDER BY r.created_at ASC
  `;
  const result = await pool.query(query, [researchId, participantId]);
  return result.rows;
};
