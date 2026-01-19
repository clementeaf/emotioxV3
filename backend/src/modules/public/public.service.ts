import pool from '../../config/database';
import cache, { CacheKeys, CacheTTL } from '../../config/cache';

interface DbResearchRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

interface DbResearchConfigModuleRow {
  name: string;
  config: unknown;
}

interface PublicQuestionDto {
  id: string;
  type: string;
  text: string;
  order: number;
  config: unknown;
  required: boolean;
  validation?: unknown;
}

interface PublicModuleStructureDto {
  components: unknown[];
}

interface PublicModuleDto {
  id: string;
  name: string;
  description: string;
  order_index: number;
  is_from_template?: boolean;
  config: Record<string, unknown>;
  structure: PublicModuleStructureDto;
  questions: PublicQuestionDto[];
}

interface PublicStageDto {
  id: string;
  name: string;
  description: string;
  order_index: number;
  stage_type: string | null;
  modules: PublicModuleDto[];
}

export interface PublicResearchDto {
  id: string;
  name: string;
  title: string;
  description: string;
  status: string;
  stages: PublicStageDto[];
  /**
   * Legacy: some clients expect modules at root level.
   * When present, it is a flattened list in display order.
   */
  modules: PublicModuleDto[];
}

/**
 * Checks whether a value is a plain object record.
 * @param value - Unknown value
 * @returns True if value is a non-null object and not an array
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Parses a json-like value that may come as string from the DB.
 * @param value - Raw value
 * @returns Parsed object record, or empty object if invalid
 */
const parseJsonRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return isRecord(parsed) ? parsed : {};
    } catch (_err: unknown) {
      return {};
    }
  }
  return isRecord(value) ? value : {};
};

/**
 * Extracts a stable module structure from module config.
 * @param config - Parsed module config record
 * @returns Normalized structure payload with a components array
 */
const extractStructure = (config: Record<string, unknown>): PublicModuleStructureDto => {
  const maybeStructure: unknown = config.structure;
  if (isRecord(maybeStructure) && Array.isArray(maybeStructure.components)) {
    return { components: maybeStructure.components };
  }
  if (Array.isArray(config.components)) {
    return { components: config.components };
  }
  return { components: [] };
};

// Function to get the participant count for a research
export const getParticipantCount = async (researchId: string): Promise<number> => {
  const query = `
    SELECT COUNT(DISTINCT participant_id) as participant_count
    FROM responses
    WHERE research_id = ?
  `;
  const result = await pool.query(query, [researchId]);
  return parseInt(result.rows[0].participant_count) || 0;
};

/**
 * Gets the research-level configuration from the "Research Configuration" module (if present).
 * @param researchId - Research ID
 * @returns Parsed config record
 */
export const getResearchConfiguration = async (researchId: string): Promise<Record<string, unknown>> => {
  // Get research modules with their configurations
  const modulesQuery = `
    SELECT m.id, m.name, m.config
    FROM modules m
    WHERE m.research_id = ?
    ORDER BY m.order_index
  `;
  const modulesResult = await pool.query(modulesQuery, [researchId]);

  // Look for Research Configuration module
  const researchConfigModule: DbResearchConfigModuleRow | undefined = (modulesResult.rows as DbResearchConfigModuleRow[])
    .find((moduleRow: DbResearchConfigModuleRow) => moduleRow.name === 'Research Configuration');

  if (researchConfigModule && researchConfigModule.config) {
    const configRecord: Record<string, unknown> = parseJsonRecord(researchConfigModule.config);
    return configRecord;
  }

  return {};
};

/**
 * Gets the public research payload including stages -> modules -> questions, for participant-frontend.
 * @param researchId - Research ID
 * @returns Research DTO
 */
export const getResearch = async (researchId: string): Promise<PublicResearchDto> => {
  const cacheKey = `${CacheKeys.PUBLIC_RESEARCH}:${researchId}`;

  try {
    return await cache.getOrSet(
      cacheKey,
      async () => {
        try {
        // Check if research is active
        const researchQuery = `
          SELECT id, name, description, status
          FROM researches
          WHERE id = ? AND status = 'active' AND deleted_at IS NULL
        `;
        const researchResult = await pool.query(researchQuery, [researchId]);

        if (researchResult.rows.length === 0) {
          // Check if research exists but is not active
          const checkQuery = `
            SELECT id, name, status, deleted_at
            FROM researches
            WHERE id = ?
          `;
          const checkResult = await pool.query(checkQuery, [researchId]);
          
          if (checkResult.rows.length === 0) {
            throw new Error(`Research not found: ${researchId}`);
          }
          
          const research = checkResult.rows[0];
          if (research.deleted_at) {
            throw new Error(`Research has been deleted: ${researchId}`);
          }
          if (research.status !== 'active') {
            throw new Error(`Research is not active (status: ${research.status}): ${researchId}`);
          }
          
          throw new Error(`Research not found or not active: ${researchId}`);
        }

        const researchRow: DbResearchRow = researchResult.rows[0] as DbResearchRow;

        // Get stages with modules + questions (MySQL-compatible approach)
        // Split into multiple simpler queries instead of complex nested JSON aggregation
        let stagesData: Array<{
          id: string;
          name: string;
          description: string | null;
          order_index: number;
          stage_type: string | null;
          modules: Array<{
            id: string;
            name: string;
            description: string | null;
            order_index: number;
            is_from_template: boolean | null;
            config: unknown;
            questions: Array<{
              id: string;
              type: string;
              text: string;
              order: number;
              config: unknown;
              validation: unknown;
              required: boolean;
            }>;
          }>;
        }> = [];

        try {
          // Step 1: Get all stages for this research
          const stagesQuery = `
            SELECT id, name, description, display_order as order_index, stage_type
            FROM stages
            WHERE research_id = ?
            ORDER BY display_order
          `;
          const stagesResult = await pool.query(stagesQuery, [researchId]);

          if (stagesResult.rows.length === 0) {
            stagesData = [];
          } else {
            // Step 2: Get all modules for these stages
            const stageIds = stagesResult.rows.map((s: Record<string, unknown>) => s.id);
            const modulesQuery = `
              SELECT id, stage_id, name, description, order_index, is_from_template, config
              FROM modules
              WHERE stage_id IN (${stageIds.map(() => '?').join(',')})
              ORDER BY order_index
            `;
            const modulesResult = await pool.query(modulesQuery, stageIds);

            // Step 3: Get all questions for these modules
            const moduleIds = modulesResult.rows.map((m: Record<string, unknown>) => m.id);
            let questionsResult: { rows: Array<Record<string, unknown>> } = { rows: [] };
            if (moduleIds.length > 0) {
              const questionsQuery = `
                SELECT id, module_id, question_type, question_text, order_index, config, validation, required
                FROM questions
                WHERE module_id IN (${moduleIds.map(() => '?').join(',')})
                ORDER BY order_index
              `;
              questionsResult = await pool.query(questionsQuery, moduleIds);
            }

            // Group questions by module_id
            const questionsByModule = new Map<string, Array<Record<string, unknown>>>();
            for (const q of questionsResult.rows) {
              const moduleId = q.module_id as string;
              if (!questionsByModule.has(moduleId)) {
                questionsByModule.set(moduleId, []);
              }
              questionsByModule.get(moduleId)!.push(q);
            }

            // Group modules by stage_id
            const modulesByStage = new Map<string, Array<Record<string, unknown>>>();
            for (const m of modulesResult.rows) {
              const stageId = m.stage_id as string;
              if (!modulesByStage.has(stageId)) {
                modulesByStage.set(stageId, []);
              }
              modulesByStage.get(stageId)!.push(m);
            }

            // Assemble the final structure
            stagesData = stagesResult.rows.map((stage: Record<string, unknown>) => {
              const stageId = stage.id as string;
              const stageModules = modulesByStage.get(stageId) || [];

              return {
                id: stageId,
                name: stage.name as string,
                description: stage.description as string | null,
                order_index: stage.order_index as number,
                stage_type: stage.stage_type as string | null,
                modules: stageModules.map((mod: Record<string, unknown>) => {
                  const moduleId = mod.id as string;
                  const moduleQuestions = questionsByModule.get(moduleId) || [];

                  return {
                    id: moduleId,
                    name: mod.name as string,
                    description: mod.description as string | null,
                    order_index: mod.order_index as number,
                    is_from_template: mod.is_from_template as boolean | null,
                    config: mod.config || {},
                    questions: moduleQuestions.map((q: Record<string, unknown>) => ({
                      id: q.id as string,
                      type: q.question_type as string,
                      text: q.question_text as string,
                      order: q.order_index as number,
                      config: q.config || {},
                      validation: q.validation || {},
                      required: (q.required as boolean) || false,
                    })),
                  };
                }),
              };
            });
          }
        } catch (queryError: unknown) {
          console.error('Error executing stages query:', queryError);
          console.error('Research ID:', researchId);
          if (queryError instanceof Error) {
            console.error('Query error stack:', queryError.stack);
          }
          throw new Error(`Failed to fetch stages: ${queryError instanceof Error ? queryError.message : 'Unknown error'}`);
        }

        // Handle case when no stages exist
        if (stagesData.length === 0) {
          console.log(`[getResearch] No stages found for research: ${researchId}`);
          return {
            id: researchRow.id,
            name: researchRow.name,
            title: researchRow.name,
            description: researchRow.description ?? '',
            status: researchRow.status,
            stages: [],
            modules: [],
          };
        }

        // Transform stagesData to PublicStageDto format
        const stages: PublicStageDto[] = stagesData.map((stageRow) => {
          const modules: PublicModuleDto[] = stageRow.modules.map((mod) => {
            // Parse config safely - MySQL may return JSON as string
            let moduleConfigRaw: unknown = mod.config;
            if (typeof moduleConfigRaw === 'string') {
              try {
                moduleConfigRaw = JSON.parse(moduleConfigRaw);
              } catch (e) {
                console.error('Error parsing module config string:', e);
                moduleConfigRaw = {};
              }
            }
            const moduleConfig: Record<string, unknown> = parseJsonRecord(moduleConfigRaw);
            const structure: PublicModuleStructureDto = extractStructure(moduleConfig);

            // Parse questions - config/validation may be strings from MySQL
            const questions: PublicQuestionDto[] = mod.questions.map((q) => {
              let qConfig: unknown = q.config;
              let qValidation: unknown = q.validation;
              if (typeof qConfig === 'string') {
                try { qConfig = JSON.parse(qConfig); } catch (_e) { qConfig = {}; }
              }
              if (typeof qValidation === 'string') {
                try { qValidation = JSON.parse(qValidation); } catch (_e) { qValidation = {}; }
              }
              return {
                id: q.id,
                type: q.type,
                text: q.text,
                order: q.order,
                config: qConfig,
                validation: qValidation,
                required: q.required,
              };
            });

            return {
              id: mod.id,
              name: mod.name,
              description: mod.description ?? '',
              order_index: mod.order_index,
              is_from_template: mod.is_from_template ?? undefined,
              config: moduleConfig,
              structure,
              questions,
            };
          });

          return {
            id: stageRow.id,
            name: stageRow.name,
            description: stageRow.description ?? '',
            order_index: stageRow.order_index,
            stage_type: stageRow.stage_type,
            modules,
          };
        });

        const flattenedModules: PublicModuleDto[] = stages.flatMap((stage: PublicStageDto) => stage.modules);

        return {
          id: researchRow.id,
          name: researchRow.name,
          title: researchRow.name,
          description: researchRow.description ?? '',
          status: researchRow.status,
          stages,
          modules: flattenedModules,
        };
      } catch (error: unknown) {
        console.error('Error in getResearch:', error);
        console.error('Research ID:', researchId);
        if (error instanceof Error) {
          console.error('Error stack:', error.stack);
        }
        throw error;
      }
      },
      CacheTTL.SHORT // Cache for 1 minute (frequently changing)
    );
  } catch (error: unknown) {
    // Clear cache on error to prevent caching bad data
    cache.delete(cacheKey);
    console.error('[getResearch] Error outside cache:', error);
    throw error;
  }
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
 * Verifies Cloudflare Turnstile token
 * @param token - Turnstile token from frontend
 * @returns true if token is valid, false otherwise
 * @throws Error if secret key is required but not configured in production
 */
const verifyTurnstileToken = async (token: string): Promise<boolean> => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, secret key is mandatory
  if (!secretKey) {
    if (isProduction) {
      console.error('[Turnstile] TURNSTILE_SECRET_KEY is required in production but not configured');
      throw new Error('Turnstile verification is not properly configured. Please contact support.');
    }
    // In development, allow skipping validation but log warning
    console.warn('[Turnstile] No secret key configured, skipping verification (development mode)');
    return true;
  }

  // Validate token format (basic check)
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    console.error('[Turnstile] Invalid token format');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error('[Turnstile] Verification request failed with status:', response.status);
      return false;
    }

    const data = await response.json() as { success: boolean; 'error-codes'?: string[]; challenge_ts?: string };

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.error('[Turnstile] Verification failed:', {
        errorCodes,
        challengeTimestamp: data.challenge_ts,
      });
      return false;
    }

    console.log('[Turnstile] Token verified successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Turnstile] Verification error:', errorMessage);
    return false;
  }
};

/**
 * Validates participant demographics against disqualifications and quota availability
 * Called before participant completes demographics step
 */
export const validateDemographics = async (
  researchId: string,
  demographicAnswers: Record<string, string>
): Promise<{ valid: boolean; reason?: 'DISQUALIFIED' | 'QUOTA_FULL'; details?: string }> => {
  try {
    // Get research configuration to access demographic rules
    const researchConfig = await getResearchConfiguration(researchId);
    const demographics = (researchConfig.demographics || {}) as Record<string, any>;

    // Import quota service
    const quotaService = await import('../quotas/quota.service');

    // Check validation through quota service
    const validation = await quotaService.checkQuotaAvailability(
      researchId,
      demographicAnswers,
      demographics
    );

    return validation;
  } catch (error) {
    console.error('Error validating demographics:', error);
    throw error;
  }
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

  // Verify Turnstile token (anti-bot protection)
  const turnstileToken = metadata.turnstileToken as string | undefined;
  const isProduction = process.env.NODE_ENV === 'production';
  const isPreviewMode = metadata.isPreviewMode === true;

  // In production, token is mandatory (except for preview mode)
  if (isProduction && !isPreviewMode) {
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
  } else {
    // In development or preview mode, validate if token is provided but don't require it
    if (turnstileToken) {
      const isValid = await verifyTurnstileToken(turnstileToken);
      if (!isValid) {
        console.warn('[Turnstile] Token validation failed in development/preview mode, but allowing request');
        // In development, we log but don't block
        if (isProduction) {
          throw new Error('Anti-bot verification failed. Please refresh the page and try again.');
        }
      }
    } else {
      if (isProduction && !isPreviewMode) {
        // This should not happen due to check above, but adding as safety
        throw new Error('Anti-bot verification is required. Please refresh the page and complete the security check.');
      }
      console.warn('[Turnstile] No token provided in metadata. This might be a preview mode request or development environment.');
    }
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

  // Check participant limit if configured
  const researchConfig = await getResearchConfiguration(researchId);
  if (researchConfig && researchConfig.participantLimit) {
    const participantLimit = researchConfig.participantLimit as { enabled: boolean; value: number };

    if (participantLimit.enabled) {
      const currentCount = await getParticipantCount(researchId);
      if (currentCount >= participantLimit.value) {
        throw new Error('Participant limit reached. No more responses are being accepted for this research.');
      }
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

  // Begin transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const savedResponses = [];

    // Insert each response
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

      const valueJson = toJsonText(response.value);
      const metadataJson = JSON.stringify(responseMetadata);

      // MySQL compatible: use INSERT ... ON DUPLICATE KEY UPDATE instead of ON CONFLICT
      // Also generate a UUID for new records
      const responseId = crypto.randomUUID();
      const query = `
        INSERT INTO responses (
          id,
          research_id,
          participant_id,
          module_id,
          component_id,
          value,
          metadata,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          value = VALUES(value),
          metadata = VALUES(metadata),
          updated_at = NOW()
      `;

      await client.query(query, [
        responseId,
        researchId,
        participantId,
        response.moduleId,
        normalizedComponentId,
        valueJson,
        metadataJson,
      ]);

      // Fetch the inserted/updated record (MySQL doesn't support RETURNING)
      const selectResult = await client.query(
        `SELECT id, created_at, updated_at FROM responses
         WHERE research_id = ? AND participant_id = ? AND module_id = ? AND component_id = ?`,
        [researchId, participantId, response.moduleId, normalizedComponentId]
      );

      savedResponses.push(selectResult.rows[0]);
    }

    // If this is a demographics module, increment quotas
    const moduleName = moduleNameById.get(moduleId);
    if (moduleName && (moduleName.toLowerCase().includes('demographic') || moduleName === 'Information')) {
      // Extract demographic answers from responses
      const demographicAnswers: Record<string, string> = {};
      for (const response of responses) {
        if (typeof response.value === 'string') {
          demographicAnswers[response.componentId] = response.value;
        }
      }

      // Increment matching quotas
      const quotaService = await import('../quotas/quota.service');
      await quotaService.incrementQuota(client, researchId, participantId, demographicAnswers);
      console.log(`✓ Updated quota counts for participant ${participantId}`);
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