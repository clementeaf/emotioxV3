import pool from '../../config/database';

export const save = async (researchId: string, participantId: string, moduleId: string, questionId: string, answer: unknown, metadata: Record<string, unknown> = {}) => {
  // MySQL compatible: pre-generate UUID and no RETURNING
  const responseId = crypto.randomUUID();
  const query = `
    INSERT INTO responses (id, research_id, participant_id, module_id, question_id, value, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  await pool.query(query, [
    responseId,
    researchId,
    participantId,
    moduleId,
    questionId,
    JSON.stringify(answer),
    JSON.stringify(metadata),
  ]);
  
  // Fetch created record (MySQL doesn't support RETURNING)
  const selectResult = await pool.query('SELECT * FROM responses WHERE id = ?', [responseId]);
  const result = { rows: selectResult.rows };
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

export const getByResearch = async (researchId: string, limit = 5000, offset = 0) => {
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
    WHERE r.research_id = ?
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const result = await pool.query(query, [researchId, limit, offset]);
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
    WHERE r.research_id = ? AND r.participant_id = ?
    ORDER BY r.created_at ASC
  `;
  const result = await pool.query(query, [researchId, participantId]);
  return result.rows;
};
