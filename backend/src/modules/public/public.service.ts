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
    WHERE research_id = $1
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
    WHERE m.research_id = $1
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

      const researchRow: DbResearchRow = researchResult.rows[0] as DbResearchRow;

      // Get stages with modules + questions (mirrors authenticated /research/:id payload shape)
      const stagesQuery = `
        SELECT s.id, s.name, s.description, s.order_index, s.stage_type,
               COALESCE(json_agg(
                 json_build_object(
                   'id', m.id,
                   'name', m.name,
                   'description', m.description,
                   'order_index', m.order_index,
                   'is_from_template', m.is_from_template,
                   'config', m.config,
                   'questions', (
                     SELECT COALESCE(json_agg(
                       json_build_object(
                         'id', q.id,
                         'type', q.question_type,
                         'text', q.question_text,
                         'order', q.order_index,
                         'config', q.config,
                         'validation', q.validation,
                         'required', q.required
                       ) ORDER BY q.order_index
                     ), '[]'::json)
                     FROM questions q WHERE q.module_id = m.id
                   )
                 ) ORDER BY m.order_index
               ) FILTER (WHERE m.id IS NOT NULL), '[]'::json) as modules
        FROM stages s
        LEFT JOIN modules m ON s.id = m.stage_id
        WHERE s.research_id = $1
        GROUP BY s.id
        ORDER BY s.order_index
      `;

      const stagesResult = await pool.query(stagesQuery, [researchId]);

      const stages: PublicStageDto[] = (stagesResult.rows as Array<Record<string, unknown>>).map(
        (row: Record<string, unknown>): PublicStageDto => {
          const stageId: string = typeof row.id === 'string' ? row.id : '';
          const stageName: string = typeof row.name === 'string' ? row.name : '';
          const stageDescriptionRaw: unknown = row.description;
          const stageDescription: string = typeof stageDescriptionRaw === 'string' ? stageDescriptionRaw : '';
          const stageOrderIndex: number = typeof row.order_index === 'number' ? row.order_index : 0;
          const stageType: string | null = typeof row.stage_type === 'string' ? row.stage_type : null;

          const rawModules: unknown = row.modules;
          const modulesArray: unknown[] = Array.isArray(rawModules) ? rawModules : [];

          const modules: PublicModuleDto[] = modulesArray
            .map((moduleValue: unknown): PublicModuleDto | null => {
              if (!isRecord(moduleValue)) return null;
              const moduleId: string = typeof moduleValue.id === 'string' ? moduleValue.id : '';
              const moduleName: string = typeof moduleValue.name === 'string' ? moduleValue.name : '';
              const moduleDescriptionRaw: unknown = moduleValue.description;
              const moduleDescription: string = typeof moduleDescriptionRaw === 'string' ? moduleDescriptionRaw : '';
              const moduleOrderIndex: number = typeof moduleValue.order_index === 'number' ? moduleValue.order_index : 0;

              const moduleConfig: Record<string, unknown> = parseJsonRecord(moduleValue.config);
              const structure: PublicModuleStructureDto = extractStructure(moduleConfig);

              const rawQuestions: unknown = moduleValue.questions;
              const questionsArray: unknown[] = Array.isArray(rawQuestions) ? rawQuestions : [];
              const questions: PublicQuestionDto[] = questionsArray
                .map((qValue: unknown): PublicQuestionDto | null => {
                  if (!isRecord(qValue)) return null;
                  const qId: string = typeof qValue.id === 'string' ? qValue.id : '';
                  const qType: string = typeof qValue.type === 'string' ? qValue.type : '';
                  const qText: string = typeof qValue.text === 'string' ? qValue.text : '';
                  const qOrder: number = typeof qValue.order === 'number' ? qValue.order : 0;
                  const qRequired: boolean = typeof qValue.required === 'boolean' ? qValue.required : false;
                  return {
                    id: qId,
                    type: qType,
                    text: qText,
                    order: qOrder,
                    config: qValue.config,
                    validation: qValue.validation,
                    required: qRequired,
                  };
                })
                .filter((q: PublicQuestionDto | null): q is PublicQuestionDto => q !== null);

              return {
                id: moduleId,
                name: moduleName,
                description: moduleDescription,
                order_index: moduleOrderIndex,
                is_from_template: typeof moduleValue.is_from_template === 'boolean' ? moduleValue.is_from_template : undefined,
                config: moduleConfig,
                structure,
                questions,
              };
            })
            .filter((m: PublicModuleDto | null): m is PublicModuleDto => m !== null);

          return {
            id: stageId,
            name: stageName,
            description: stageDescription,
            order_index: stageOrderIndex,
            stage_type: stageType,
            modules,
          };
        }
      );

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
    WHERE id = $1 AND status = 'active' AND deleted_at IS NULL
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
    const modulesLookupQuery = `
      SELECT id, name
      FROM modules
      WHERE id = ANY($1::uuid[])
    `;
    const modulesLookupResult = await pool.query(modulesLookupQuery, [uniqueModuleIds]);
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

      const responseMetadata: Record<string, unknown> = {
        ...(response.metadata ?? {}),
        ...(normalizedComponentId !== originalComponentId ? { originalComponentId } : {}),
        moduleMetadata: metadata,
      };

      const result = await client.query(query, [
        researchId,
        participantId,
        response.moduleId,
        normalizedComponentId,
        // Ensure JSON text for json/jsonb column, while preserving already-stringified JSON payloads
        toJsonText(response.value),
        JSON.stringify(responseMetadata),
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