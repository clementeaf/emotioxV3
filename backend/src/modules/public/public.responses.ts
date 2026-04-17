import pool from '../../config/database';
import { ParticipantResponsePayload } from './public.types';
import { getResearchConfiguration, getParticipantCount } from './public.research';
import { getEffectiveParticipantLimitCap } from './public.participation';
import { verifyTurnstileToken } from './public.validation';

/**
 * Check if a participant has already submitted non-demographic responses.
 * Excludes demographics-only rows so "answered screening only" can continue the survey.
 */
export const getParticipantStatus = async (researchId: string, participantId: string) => {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM responses
     WHERE research_id = ? AND participant_id = ? AND module_id != 'demographics'`,
    [researchId, participantId]
  );
  const hasResponded = (result.rows[0]?.count ?? 0) > 0;
  return { participantId, hasResponded };
};

/**
 * Get all responses for a participant (read-only review mode)
 */
export const getParticipantResponses = async (researchId: string, participantId: string) => {
  // Verify research exists
  const researchResult = await pool.query(
    'SELECT id FROM researches WHERE id = ? AND deleted_at IS NULL',
    [researchId]
  );
  if (researchResult.rows.length === 0) {
    throw new Error('Research not found');
  }

  const query = `
    SELECT module_id, component_id, value, created_at
    FROM responses
    WHERE research_id = ? AND participant_id = ?
    ORDER BY created_at ASC
  `;
  const result = await pool.query(query, [researchId, participantId]);
  return result.rows;
};

/**
 * Legacy endpoint for saving responses (deprecated)
 * @param data - Response data in legacy format
 * @returns Saved response record
 */
export const saveResponse = async (data: Record<string, unknown>) => {
  const { research_id, participant_id, module_id, question_id, answer, metadata = {} } = data;

  // Validate that participantId is present and not empty
  // This prevents preview mode responses from being saved
  if (!participant_id || typeof participant_id !== 'string' || participant_id.trim() === '') {
    throw new Error('participant_id is required. Preview mode responses are not saved.');
  }

  // Verify Turnstile token for legacy endpoint (anti-bot protection)
  const metadataRecord = typeof metadata === 'object' && metadata !== null ? metadata as Record<string, unknown> : {};
  const turnstileToken = metadataRecord.turnstileToken as string | undefined;
  const isProduction = process.env.NODE_ENV === 'production';
  const isPreviewMode = metadataRecord.isPreviewMode === true;

  // In production, token is mandatory (except for preview mode)
  if (isProduction && !isPreviewMode) {
    if (!turnstileToken) {
      console.error('[Turnstile] Token is required in production but not provided (legacy endpoint)');
      throw new Error('Anti-bot verification is required. Please refresh the page and complete the security check.');
    }

    try {
      const isValid = await verifyTurnstileToken(turnstileToken);
      if (!isValid) {
        throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
      console.error('[Turnstile] Verification error (legacy endpoint):', errorMessage);
      throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
    }
  } else if (turnstileToken) {
    // In development or preview mode, validate if token is provided but don't require it
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) {
      console.warn('[Turnstile] Token validation failed in development/preview mode (legacy endpoint), but allowing request');
      if (isProduction) {
        throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
      }
    }
  } else {
    console.warn('[Turnstile] No token provided in metadata (legacy endpoint). This might be a preview mode request or development environment.');
  }

  // Generate UUID for the new response (MySQL compatible)
  const responseId = crypto.randomUUID();
  const query = `
    INSERT INTO responses (id, research_id, participant_id, module_id, question_id, value, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  await pool.query(query, [
    responseId,
    research_id,
    participant_id,
    module_id,
    question_id,
    JSON.stringify(answer),
    JSON.stringify(metadata),
  ]);

  // Return the created record (MySQL doesn't support RETURNING)
  const selectResult = await pool.query(
    'SELECT id, created_at FROM responses WHERE id = ?',
    [responseId]
  );
  return selectResult.rows[0];
};

/**
 * Save participant responses for a module
 * This is the modern endpoint for saving responses from participant-frontend
 */
export const saveParticipantResponses = async (
  researchId: string,
  payload: ParticipantResponsePayload
) => {
  const { participantId, moduleId, responses, metadata = {} } = payload;

  // Turnstile verification temporarily disabled
  // TODO: Re-enable when TURNSTILE_SECRET_KEY is configured
  const turnstileEnabled = !!process.env.TURNSTILE_SECRET_KEY;

  if (turnstileEnabled) {
    // Verify Turnstile token (anti-bot protection)
    // Note: Turnstile tokens are single-use. After the first successful verification,
    // the frontend sends null to indicate "already verified" for subsequent requests.
    const turnstileToken = metadata.turnstileToken as string | null | undefined;
    const isProduction = process.env.NODE_ENV === 'production';
    const isPreviewMode = metadata.isPreviewMode === true;

    // If token is explicitly null (not undefined), it means the participant was already verified
    // in a previous request. We allow the request to proceed.
    const alreadyVerified = turnstileToken === null;

    // In production, token is mandatory for first request (except for preview mode)
    if (isProduction && !isPreviewMode && !alreadyVerified) {
      if (!turnstileToken) {
        console.error('[Turnstile] Token is required in production but not provided');
        throw new Error('Anti-bot verification is required. Please refresh the page and complete the security check.');
      }

      try {
        const isValid = await verifyTurnstileToken(turnstileToken);
        if (!isValid) {
          throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
        console.error('[Turnstile] Verification error:', errorMessage);
        throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
      }
    } else if (turnstileToken && typeof turnstileToken === 'string') {
      // Validate token if provided (development mode or optional verification)
      const isValid = await verifyTurnstileToken(turnstileToken);
      if (!isValid) {
        console.warn('[Turnstile] Token validation failed, but allowing request');
        if (isProduction && !isPreviewMode && !alreadyVerified) {
          throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
        }
      }
    } else if (alreadyVerified) {
      // Token is null - participant already verified in a previous request
      console.log('[Turnstile] Skipping verification - participant already verified');
    } else {
      console.warn('[Turnstile] No token provided. This might be a preview mode request or development environment.');
    }
  } else {
    console.warn('[Turnstile] Verification disabled - TURNSTILE_SECRET_KEY not configured');
  }

  /**
   * Checks whether a string is valid JSON text.
   * @param value - String to validate
   * @returns True if JSON.parse succeeds
   */
  const isJsonText = (value: string): boolean => {
    try {
      JSON.parse(value);
      return true;
    } catch (_err: unknown) {
      return false;
    }
  };

  /**
   * Serializes a value for insertion into a JSON/JSONB column.
   * @param value - Raw value from client
   * @returns JSON text (string) safe to send to Postgres json/jsonb column
   */
  const toJsonText = (value: unknown): string => {
    if (typeof value === 'string') {
      return isJsonText(value) ? value : JSON.stringify(value);
    }
    return JSON.stringify(value);
  };

  /**
   * Normalizes a componentId to the canonical IDs used by analytics and results.
   * @param rawComponentId - Component ID from client
   * @param moduleName - Module name (optional) to help disambiguate
   * @returns Normalized componentId
   */
  const normalizeComponentId = (rawComponentId: string, moduleName?: string): string => {
    const id = rawComponentId.trim();
    const lowerId = id.toLowerCase();
    const lowerName = (moduleName ?? '').toLowerCase();

    // Cognitive Tasks (canonical: answer/choice/scale/ranking/navigation-flow/preference-test)
    if (lowerId === 'short-text-answer' || lowerId === 'long-text-answer' || lowerId === 'text-answer') return 'answer';
    if (lowerId === 'navigation_flow' || lowerId === 'navigationflow') return 'navigation-flow';
    if (lowerId === 'preference_test' || lowerId === 'preferencetest') return 'preference-test';

    // SmartVOC (canonical: scale/emotions/text)
    if (lowerId === 'csat-scale' || lowerId === 'nps-scale' || lowerId === 'ces-scale' || lowerId === 'cv-scale') return 'scale';
    if (lowerId === 'nev-emotions') return 'emotions';
    if (lowerId === 'voc-response') return 'text';

    // If module name hints SmartVOC, keep known IDs stable
    if (lowerName.includes('voc') && lowerId === 'answer') return 'text';

    return id;
  };

  // Validate that participantId is present and not empty
  // This prevents preview mode responses from being saved
  if (!participantId || typeof participantId !== 'string' || participantId.trim() === '') {
    throw new Error('participantId is required. Preview mode responses are not saved.');
  }

  // Validate research exists and is active
  const researchQuery = `
    SELECT id FROM researches
    WHERE id = ? AND status = 'active' AND deleted_at IS NULL
  `;
  const researchResult = await pool.query(researchQuery, [researchId]);
  if (researchResult.rows.length === 0) {
    throw new Error('Research not found or not active');
  }

  const researchConfig = await getResearchConfiguration(researchId);
  const participantCap = getEffectiveParticipantLimitCap(researchConfig);
  if (participantCap !== null) {
    const currentCount = await getParticipantCount(researchId);
    if (currentCount >= participantCap) {
      throw new Error('Participant limit reached. No more responses are being accepted for this research.');
    }
  }

  // Load module names for normalization (best-effort)
  const uniqueModuleIds: string[] = Array.from(
    new Set(
      responses
        .map((r) => r.moduleId)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
    )
  );

  const moduleNameById: Map<string, string> = new Map();
  if (uniqueModuleIds.length > 0) {
    // MySQL compatible: use IN (?, ?, ...) instead of ANY($1::uuid[])
    const modulesLookupQuery = `
      SELECT id, name
      FROM modules
      WHERE id IN (${uniqueModuleIds.map(() => '?').join(',')})
    `;
    const modulesLookupResult = await pool.query(modulesLookupQuery, uniqueModuleIds);
    (modulesLookupResult.rows as Array<{ id: string; name: string }>).forEach((row) => {
      if (row && typeof row.id === 'string' && typeof row.name === 'string') {
        moduleNameById.set(row.id, row.name);
      }
    });
  }

  // Pre-process all responses before opening the transaction to minimize connection hold time.
  // Sentiment analysis (CPU-bound, no DB) runs here so the transaction only does I/O.
  const { analyzeSentiment } = await import('../sentiment/sentiment.service');

  const prepared: Array<{
    id: string;
    moduleId: string;
    componentId: string;
    valueJson: string;
    metadataJson: string;
  }> = [];

  for (const response of responses) {
    if (!response.componentId || typeof response.componentId !== 'string' || response.componentId.trim().length === 0) {
      throw new Error('componentId is required for each response');
    }

    const moduleName = moduleNameById.get(response.moduleId);
    const normalizedComponentId = normalizeComponentId(response.componentId, moduleName);
    const originalComponentId = response.componentId.trim();

    const responseMetadata: Record<string, unknown> = {
      ...(response.metadata ?? {}),
      ...(normalizedComponentId !== originalComponentId ? { originalComponentId } : {}),
      moduleMetadata: metadata,
    };

    // Auto-detect sentiment for text responses (answer = Short/Long Text, text = VOC)
    if ((normalizedComponentId === 'answer' || normalizedComponentId === 'text') && typeof response.value === 'string' && response.value.trim().length > 0) {
      const { sentiment } = analyzeSentiment(response.value);
      responseMetadata.sentiment = sentiment;
    }

    prepared.push({
      id: crypto.randomUUID(),
      moduleId: response.moduleId,
      componentId: normalizedComponentId,
      valueJson: toJsonText(response.value),
      metadataJson: JSON.stringify(responseMetadata),
    });
  }

  // Begin transaction — hold the connection as briefly as possible
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Batch INSERT: single query for all responses (was N individual INSERTs + N SELECTs)
    if (prepared.length > 0) {
      const placeholders = prepared.map(() => '(?, ?, ?, ?, ?, ?, ?, NOW())').join(', ');
      const values = prepared.flatMap(p => [
        p.id, researchId, participantId, p.moduleId, p.componentId, p.valueJson, p.metadataJson,
      ]);

      await client.query(`
        INSERT INTO responses (id, research_id, participant_id, module_id, component_id, value, metadata, created_at)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE
          value = VALUES(value),
          metadata = VALUES(metadata),
          updated_at = NOW()
      `, values);
    }

    await client.query('COMMIT');

    console.log(`✓ Saved ${prepared.length} responses for participant ${participantId}`);

    // Update participant status in participants table (panel mode tracking)
    try {
      const { updateStatus } = await import('../participants/participants.service');
      await updateStatus(researchId, participantId, 'responded');
    } catch (_statusErr) {
      // Non-critical: participant may not exist in participants table (kiosk mode, legacy)
    }

    // After successful COMMIT, broadcast real-time update via SSE if SmartVOC module
    const savedModuleName = moduleNameById.get(moduleId)?.toLowerCase() ?? '';
    const isSmartVOC = ['csat', 'nps', 'ces', 'cv', 'nev', 'voc'].some(t => savedModuleName.includes(t));
    if (isSmartVOC) {
      try {
        const { monitorSSEService } = await import('../monitor/monitor-sse.service');
        const analyticsService = await import('../analytics');
        const results = await analyticsService.getSmartVOCResults(researchId);
        monitorSSEService.broadcastToResearch(researchId, 'smartvoc-update', results);
      } catch (sseErr) {
        console.error('Failed to broadcast SmartVOC SSE update:', sseErr);
      }
    }

    return {
      success: true,
      message: `Saved ${prepared.length} responses`,
      count: prepared.length,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving participant responses:', error);
    throw error;
  } finally {
    client.release();
  }
};
