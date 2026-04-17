import pool from '../../config/database';

/**
 * Analytics Service
 * Aggregates and analyzes participant responses for research results
 */

// ==========================================
// COGNITIVE TASK RESULTS
// ==========================================

// Module types that have their own dedicated analytics endpoint — the frontend
// fetches detailed responses from there, so /cognitive-tasks only needs the count.
const MODULES_WITH_OWN_ENDPOINT = new Set([
  'navigation flow', 'preference test', 'single choice', 'multiple choice',
  'linear scale', 'ranking',
]);

export const getCognitiveTaskResults = async (researchId: string) => {
  // Get all modules for this research (include config to extract question text)
  const modulesQuery = `
    SELECT id, name, description, config
    FROM modules
    WHERE research_id = ?
      AND stage_id IS NOT NULL
    ORDER BY order_index
  `;
  const modulesResult = await pool.query(modulesQuery, [researchId]);
  const allModules = modulesResult.rows;

  // Split modules: those with dedicated endpoints only need counts,
  // text modules need full responses for inline rendering.
  const countOnlyIds: string[] = [];
  const fullFetchIds: string[] = [];
  for (const m of allModules) {
    if (MODULES_WITH_OWN_ENDPOINT.has((m.name as string).toLowerCase())) {
      countOnlyIds.push(m.id as string);
    } else {
      fullFetchIds.push(m.id as string);
    }
  }

  // Batch: 1 grouped COUNT for modules with own endpoints (replaces N individual queries)
  const countsMap = new Map<string, number>();
  if (countOnlyIds.length > 0) {
    const countQuery = `
      SELECT module_id, COUNT(*) as cnt
      FROM responses
      WHERE research_id = ? AND module_id IN (${countOnlyIds.map(() => '?').join(',')})
      GROUP BY module_id
    `;
    const countResult = await pool.query(countQuery, [researchId, ...countOnlyIds]);
    for (const row of countResult.rows) {
      countsMap.set(row.module_id as string, (row.cnt as number));
    }
  }

  // Fetch full responses only for text modules (parallel)
  const fullResponsesMap = new Map<string, Awaited<ReturnType<typeof getModuleResponses>>>();
  if (fullFetchIds.length > 0) {
    const results = await Promise.all(
      fullFetchIds.map(async (id) => ({ id, responses: await getModuleResponses(researchId, id) }))
    );
    for (const { id, responses } of results) {
      fullResponsesMap.set(id, responses);
    }
  }

  // Assemble response
  const modules = allModules.map((module) => {
    const moduleId = module.id as string;
    const hasOwnEndpoint = MODULES_WITH_OWN_ENDPOINT.has((module.name as string).toLowerCase());
    const responses = hasOwnEndpoint ? [] : (fullResponsesMap.get(moduleId) ?? []);
    const totalResponses = hasOwnEndpoint ? (countsMap.get(moduleId) ?? 0) : responses.length;

    // Extract question text from module config
    let questionText = '';
    try {
      const config = typeof module.config === 'string' ? JSON.parse(module.config) : module.config;
      const structure = config?.structure ?? config;
      const titleComponent = structure?.components?.find((c: { id: string }) => c.id === 'question-title');
      questionText = titleComponent?.value || '';
    } catch { /* ignore */ }

    return {
      moduleId,
      moduleName: module.name,
      description: module.description,
      questionText,
      totalResponses,
      responses,
    };
  });

  return { modules };
};

// ==========================================
// NAVIGATION FLOW RESULTS
// ==========================================

export const getNavigationFlowResults = async (researchId: string, moduleId: string) => {
  const query = `
    SELECT 
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id
    FROM responses r
    WHERE r.research_id = ? 
      AND r.module_id = ?
      AND r.component_id = 'navigation-flow'
    ORDER BY r.created_at ASC
  `;

  const result = await pool.query(query, [researchId, moduleId]);

  const responses = result.rows.map(row => {
    try {
      const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return {
        participantId: row.participant_id,
        ...value,
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Error parsing navigation flow response:', error);
      return null;
    }
  }).filter(r => r !== null);

  // Aggregate statistics
  const totalResponses = responses.length;
  const completedFlows = responses.filter((r: any) => r.completed).length;
  const totalClicks = responses.reduce((sum: number, r: any) => sum + (r.totalClicks || 0), 0);
  const correctClicks = responses.reduce((sum: number, r: any) => sum + (r.correctClicks || 0), 0);
  const averageDuration = totalResponses > 0 
    ? responses.reduce((sum: number, r: any) => sum + (r.totalDuration || 0), 0) / totalResponses
    : 0;

  // Heatmap data: aggregate all click coordinates with participantId (for AOI per-participant stats)
  const allClicks = responses.flatMap((r: any) =>
    (r.clickSequence || []).map((c: any) => ({ ...c, participantId: r.participantId }))
  );

  // Strip clickSequence from per-participant responses — frontend only needs summary stats
  // for the Navigation tab table. Click data lives in heatmapData (with participantId).
  const lightResponses = responses.map((r: any) => ({
    participantId: r.participantId,
    completed: r.completed,
    totalClicks: r.totalClicks || 0,
    correctClicks: r.correctClicks || 0,
    incorrectClicks: r.incorrectClicks || 0,
    totalDuration: r.totalDuration || 0,
    imagesNavigated: r.imagesNavigated,
    totalImages: r.totalImages,
    createdAt: r.createdAt,
  }));

  return {
    totalResponses,
    completedFlows,
    completionRate: totalResponses > 0 ? (completedFlows / totalResponses) * 100 : 0,
    totalClicks,
    correctClicks,
    accuracy: totalClicks > 0 ? (correctClicks / totalClicks) * 100 : 0,
    averageDuration: Math.round(averageDuration / 1000), // Convert to seconds
    heatmapData: allClicks,
    responses: lightResponses,
  };
};

// ==========================================
// PREFERENCE TEST RESULTS
// ==========================================

export const getPreferenceTestResults = async (researchId: string, moduleId: string) => {
  const query = `
    SELECT 
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id
    FROM responses r
    WHERE r.research_id = ? 
      AND r.module_id = ?
      AND r.component_id = 'preference-test'
    ORDER BY r.created_at ASC
  `;

  const result = await pool.query(query, [researchId, moduleId]);

  const responses = result.rows.map(row => {
    try {
      const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return {
        participantId: row.participant_id,
        ...value,
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      console.error('Error parsing preference test response:', error);
      return null;
    }
  }).filter(r => r !== null);

  // Aggregate selections
  const selectionCounts: Record<number, number> = {};
  responses.forEach((r: any) => {
    const imageId = r.selectedImageId;
    if (imageId) {
      selectionCounts[imageId] = (selectionCounts[imageId] || 0) + 1;
    }
  });

  // Calculate view statistics
  const totalViewTime = responses.reduce((sum: number, r: any) => {
    return sum + (r.viewHistory || []).reduce((s: number, v: any) => s + (v.duration || 0), 0);
  }, 0);

  const averageViewTime = responses.length > 0 ? totalViewTime / responses.length : 0;

  return {
    totalResponses: responses.length,
    selections: Object.entries(selectionCounts).map(([imageId, count]) => ({
      imageId: parseInt(imageId),
      count,
      percentage: responses.length > 0 ? (count / responses.length) * 100 : 0,
    })),
    averageViewTime: Math.round(averageViewTime),
    responses,
  };
};

// ==========================================
// TEXT RESPONSES
// ==========================================

export const getTextResponses = async (researchId: string, moduleId: string) => {
  const query = `
    SELECT 
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id
    FROM responses r
    WHERE r.research_id = ? 
      AND r.module_id = ?
      AND r.component_id = 'answer'
    ORDER BY r.created_at DESC
  `;

  const result = await pool.query(query, [researchId, moduleId]);

  const { analyzeSentiment } = await import('../sentiment/sentiment.service');

  const responses = result.rows.map(row => {
    const text = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
    // Read sentiment from metadata or compute
    let sentiment: string | undefined;
    try {
      const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
      sentiment = meta?.sentiment;
    } catch { /* ignore */ }
    if (!sentiment && text.trim().length > 0) {
      sentiment = analyzeSentiment(text).sentiment;
    }
    return {
      participantId: row.participant_id,
      text,
      sentiment,
      metadata: row.metadata,
      createdAt: row.created_at,
    };
  });

  return {
    totalResponses: responses.length,
    responses,
  };
};

// ==========================================
// CHOICE RESPONSES (Single/Multiple)
// ==========================================

export const getChoiceResponses = async (researchId: string, moduleId: string) => {
  const [result, moduleResult] = await Promise.all([
    pool.query(`
      SELECT
        r.value,
        r.metadata,
        r.created_at,
        r.participant_id
      FROM responses r
      WHERE r.research_id = ?
        AND r.module_id = ?
        AND r.component_id = 'choice'
      ORDER BY r.created_at ASC
    `, [researchId, moduleId]),
    pool.query(`SELECT config FROM modules WHERE id = ?`, [moduleId]),
  ]);

  // Extract question text and configured choices from module structure
  let questionText = '';
  const configuredChoices: Array<{ id: string; label: string }> = [];
  if (moduleResult.rows.length > 0) {
    try {
      const config = typeof moduleResult.rows[0].config === 'string'
        ? JSON.parse(moduleResult.rows[0].config)
        : moduleResult.rows[0].config;
      const structure = config?.structure ?? config;
      const titleComponent = structure?.components?.find((c: { id: string }) => c.id === 'question-title');
      questionText = titleComponent?.value || '';
      // Extract choice options (components with settings.isChoice)
      const choiceComponents = (structure?.components ?? []).filter((c: any) => c.settings?.isChoice);
      choiceComponents.forEach((c: { id: string; value?: string; name?: string }) => {
        configuredChoices.push({ id: c.id, label: c.value || c.name || c.id });
      });
    } catch { /* ignore */ }
  }

  const responses = result.rows.map(row => {
    try {
      const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return {
        participantId: row.participant_id,
        choices: Array.isArray(value) ? value : [value],
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      const value = row.value;
      return {
        participantId: row.participant_id,
        choices: Array.isArray(value) ? value : [value],
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    }
  });

  // Aggregate choice counts
  const choiceCounts: Record<string, number> = {};
  responses.forEach((r: any) => {
    r.choices.forEach((choice: string) => {
      choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
    });
  });

  // Build choice labels map (id → label)
  const choiceLabels: Record<string, string> = {};
  configuredChoices.forEach(c => { choiceLabels[c.id] = c.label; });

  // Build choiceCounts including configured choices with 0 responses
  const allChoiceIds = new Set([
    ...Object.keys(choiceCounts),
    ...configuredChoices.map(c => c.id),
  ]);

  return {
    totalResponses: responses.length,
    questionText,
    choiceCounts: Array.from(allChoiceIds).map(choiceId => ({
      choice: choiceLabels[choiceId] || choiceId,
      count: choiceCounts[choiceId] || 0,
      percentage: responses.length > 0 ? ((choiceCounts[choiceId] || 0) / responses.length) * 100 : 0,
    })),
    responses,
  };
};

// ==========================================
// DEMOGRAPHIC RESPONSES (for Cognitive Tasks filters / export)
// ==========================================

export const getDemographicResponses = async (researchId: string) => {
  const query = `
    SELECT participant_id, demographic_type, demographic_value
    FROM participant_demographics
    WHERE research_id = ?
    ORDER BY participant_id, demographic_type
  `;
  const result = await pool.query(query, [researchId]);
  const rows = (result.rows || []) as Array<{ participant_id: string; demographic_type: string; demographic_value: string }>;

  const byParticipant = new Map<string, Record<string, string>>();
  for (const row of rows) {
    const pid = row.participant_id;
    if (!byParticipant.has(pid)) byParticipant.set(pid, {});
    byParticipant.get(pid)![row.demographic_type] = row.demographic_value;
  }

  const participants = Array.from(byParticipant.entries()).map(([participantId, demographics]) => ({
    participantId,
    demographics,
  }));

  const demographicTypes = Array.from(
    new Set(rows.map((r) => r.demographic_type))
  ).sort();

  return {
    participants,
    demographicTypes,
  };
};

// ==========================================
// SCALE RESPONSES (Linear Scale)
// ==========================================

export const getScaleResponses = async (researchId: string, moduleId: string) => {
  // Fetch responses and module config in parallel
  const [result, moduleResult] = await Promise.all([
    pool.query(`
      SELECT
        r.value,
        r.metadata,
        r.created_at,
        r.participant_id
      FROM responses r
      INNER JOIN (
        SELECT participant_id, MAX(created_at) as max_created
        FROM responses
        WHERE research_id = ? AND module_id = ? AND component_id = 'scale'
        GROUP BY participant_id
      ) latest ON r.participant_id = latest.participant_id AND r.created_at = latest.max_created
      WHERE r.research_id = ?
        AND r.module_id = ?
        AND r.component_id = 'scale'
      ORDER BY r.created_at ASC
    `, [researchId, moduleId, researchId, moduleId]),
    pool.query(`SELECT config FROM modules WHERE id = ?`, [moduleId]),
  ]);

  // Extract question text and scale range from module structure
  let questionText = '';
  let scaleStart = 1;
  let scaleEnd = 5;
  if (moduleResult.rows.length > 0) {
    try {
      const config = typeof moduleResult.rows[0].config === 'string'
        ? JSON.parse(moduleResult.rows[0].config)
        : moduleResult.rows[0].config;
      const structure = config?.structure ?? config;
      const titleComponent = structure?.components?.find((c: { id: string }) => c.id === 'question-title');
      questionText = titleComponent?.value || '';
      // New format: single scale-range component (e.g. "1-5", "0-10")
      const rangeComponent = structure?.components?.find((c: { id: string }) => c.id === 'scale-range');
      if (rangeComponent?.value && String(rangeComponent.value).includes('-')) {
        const [rangeMin, rangeMax] = String(rangeComponent.value).split('-').map(Number);
        if (!isNaN(rangeMin)) scaleStart = rangeMin;
        if (!isNaN(rangeMax)) scaleEnd = rangeMax;
      } else if (rangeComponent?.defaultValue && String(rangeComponent.defaultValue).includes('-')) {
        const [rangeMin, rangeMax] = String(rangeComponent.defaultValue).split('-').map(Number);
        if (!isNaN(rangeMin)) scaleStart = rangeMin;
        if (!isNaN(rangeMax)) scaleEnd = rangeMax;
      } else {
        // Legacy: separate start-value / end-value components
        const startComponent = structure?.components?.find((c: { id: string }) => c.id === 'scale-start-value');
        const endComponent = structure?.components?.find((c: { id: string }) => c.id === 'scale-end-value');
        if (startComponent?.value) scaleStart = parseInt(startComponent.value) || 1;
        if (endComponent?.value) scaleEnd = parseInt(endComponent.value) || 5;
      }
    } catch { /* ignore parse errors */ }
  }

  const responses = result.rows.map(row => ({
    participantId: row.participant_id,
    value: typeof row.value === 'number' ? row.value : parseInt(row.value as string),
    metadata: row.metadata,
    createdAt: row.created_at,
  }));

  // Aggregate scale distribution (include all values in configured range)
  const distribution: Record<number, number> = {};
  for (let i = scaleStart; i <= scaleEnd; i++) {
    distribution[i] = 0;
  }
  responses.forEach((r: any) => {
    const value = r.value;
    distribution[value] = (distribution[value] || 0) + 1;
  });

  const average = responses.length > 0
    ? responses.reduce((sum: number, r: any) => sum + r.value, 0) / responses.length
    : 0;

  return {
    totalResponses: responses.length,
    average: Math.round(average * 100) / 100,
    questionText,
    distribution: Object.entries(distribution).map(([value, count]) => ({
      value: parseInt(value),
      count,
      percentage: responses.length > 0 ? (count / responses.length) * 100 : 0,
    })),
    responses,
  };
};

// ==========================================
// RANKING RESPONSES
// ==========================================

export const getRankingResponses = async (researchId: string, moduleId: string) => {
  // Fetch responses and module structure in parallel
  const [result, moduleResult] = await Promise.all([
    pool.query(`
      SELECT r.value, r.metadata, r.created_at, r.participant_id
      FROM responses r
      WHERE r.research_id = ? AND r.module_id = ? AND r.component_id = 'ranking'
      ORDER BY r.created_at ASC
    `, [researchId, moduleId]),
    pool.query(`SELECT config FROM modules WHERE id = ?`, [moduleId]),
  ]);

  // Build id→label map from module structure (structure is nested inside config)
  const itemLabels: Record<string, string> = {};
  let questionText = '';
  if (moduleResult.rows.length > 0) {
    try {
      const config = typeof moduleResult.rows[0].config === 'string'
        ? JSON.parse(moduleResult.rows[0].config)
        : moduleResult.rows[0].config;
      const structure = config?.structure ?? config;
      const titleComponent = structure?.components?.find((c: { id: string }) => c.id === 'question-title');
      questionText = titleComponent?.value || '';
      const rankingComponent = structure?.components?.find((c: any) => c.type === 'ranking-list' || c.rankingConfig);
      // Items can be in rankingConfig.items or in value (as JSON string with {items, randomize})
      let items = rankingComponent?.rankingConfig?.items ?? [];
      if (items.length === 0 && rankingComponent?.value) {
        const parsed = typeof rankingComponent.value === 'string'
          ? JSON.parse(rankingComponent.value)
          : rankingComponent.value;
        items = parsed?.items ?? [];
      }
      items.forEach((item: { id: string; label: string }) => {
        itemLabels[item.id] = item.label;
      });
    } catch { /* structure parse error — labels will fallback to IDs */ }
  }

  const responses = result.rows.map(row => {
    try {
      const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return {
        participantId: row.participant_id,
        ranking: Array.isArray(value) ? value : [],
        metadata: row.metadata,
        createdAt: row.created_at,
      };
    } catch (error) {
      return null;
    }
  }).filter(r => r !== null);

  // Calculate mean position for each option
  const positionSums: Record<string, { sum: number; count: number }> = {};

  responses.forEach((r: any) => {
    r.ranking.forEach((item: string, index: number) => {
      if (!positionSums[item]) {
        positionSums[item] = { sum: 0, count: 0 };
      }
      positionSums[item].sum += index + 1; // Position starts at 1
      positionSums[item].count += 1;
    });
  });

  // Build rankings from responses, then add any configured items with 0 responses
  const rankingsFromResponses = Object.entries(positionSums).map(([item, data]) => ({
    item,
    label: itemLabels[item] || item,
    meanPosition: data.count > 0 ? data.sum / data.count : 0,
    count: data.count,
  }));

  // Add configured items that have no responses yet
  const respondedItems = new Set(rankingsFromResponses.map(r => r.item));
  const configuredItems = Object.entries(itemLabels)
    .filter(([id]) => !respondedItems.has(id))
    .map(([id, label]) => ({ item: id, label, meanPosition: 0, count: 0 }));

  const rankings = [...rankingsFromResponses, ...configuredItems]
    .sort((a, b) => a.meanPosition - b.meanPosition);

  return {
    totalResponses: responses.length,
    questionText,
    rankings,
    responses,
  };
};

// ==========================================
// SCREENER RESULTS
// ==========================================

export const getScreenerResults = async (researchId: string) => {
  // 1. Find the Screener stage and its module(s)
  const stageQuery = `
    SELECT s.id as stage_id, s.name as stage_name
    FROM stages s
    WHERE s.research_id = ?
      AND LOWER(s.name) = 'screener'
    LIMIT 1
  `;
  const stageResult = await pool.query(stageQuery, [researchId]);
  if (stageResult.rows.length === 0) {
    return { totalResponses: 0, qualified: 0, disqualified: 0, overquota: 0, choiceDistribution: [], dailyDistribution: [], bestDay: null, slowestDay: null, weeklyTimeSeries: [] };
  }
  const stageId = stageResult.rows[0].stage_id;

  // 2. Get Screener module(s) with config to extract choices and question text
  const moduleQuery = `
    SELECT id, name, config FROM modules
    WHERE research_id = ? AND stage_id = ?
    ORDER BY order_index
  `;
  const moduleResult = await pool.query(moduleQuery, [researchId, stageId]);

  // Extract choices config (Qualify/Disqualify labels) and question text from module
  const choicesMeta: Array<{ id: string; label: string; eligibility: string }> = [];
  let questionText = '';
  const moduleIds: string[] = [];
  for (const mod of moduleResult.rows) {
    moduleIds.push(mod.id);
    try {
      const config = typeof mod.config === 'string' ? JSON.parse(mod.config) : mod.config;
      const structure = config?.structure ?? config;
      // Question title
      const titleComp = structure?.components?.find((c: any) => c.id === 'question-title');
      if (titleComp?.value && !questionText) questionText = titleComp.value;
      // Choices with eligibility
      const choiceComps = (structure?.components ?? []).filter((c: any) => c.settings?.isChoice);
      for (const c of choiceComps) {
        choicesMeta.push({
          id: c.id,
          label: c.value || c.name || c.id,
          eligibility: c.settings?.eligibility || 'Qualify',
        });
      }
      // Also check choicesConfig format
      const choicesComp = structure?.components?.find((c: any) => c.choicesConfig);
      if (choicesComp?.choicesConfig?.choices) {
        for (const ch of choicesComp.choicesConfig.choices) {
          if (!choicesMeta.some(m => m.id === ch.id)) {
            choicesMeta.push({
              id: ch.id,
              label: ch.label || ch.id,
              eligibility: ch.eligibility || 'Qualify',
            });
          }
        }
      }
    } catch { /* ignore */ }
  }

  if (moduleIds.length === 0) {
    return { totalResponses: 0, qualified: 0, disqualified: 0, overquota: 0, choiceDistribution: [], dailyDistribution: [], bestDay: null, slowestDay: null, weeklyTimeSeries: [], questionText };
  }

  // 3. Get all responses for Screener modules
  const placeholders = moduleIds.map(() => '?').join(',');
  const responsesQuery = `
    SELECT
      r.value,
      r.participant_id,
      r.component_id,
      r.created_at
    FROM responses r
    WHERE r.research_id = ?
      AND r.module_id IN (${placeholders})
      AND r.component_id = 'choice'
    ORDER BY r.created_at ASC
  `;
  const responsesResult = await pool.query(responsesQuery, [researchId, ...moduleIds]);

  // 4. Get participant statuses from participants table
  const statusQuery = `
    SELECT status, COUNT(*) as cnt
    FROM participants
    WHERE research_id = ?
    GROUP BY status
  `;
  const statusResult = await pool.query(statusQuery, [researchId]);
  const statusCounts: Record<string, number> = {};
  for (const row of statusResult.rows) {
    statusCounts[row.status] = parseInt(row.cnt);
  }

  // 5. Also count from participant_demographics for disqualifications (kiosk mode doesn't use participants table)
  // Use responses-based counting as primary source
  const responses = responsesResult.rows.map(row => {
    let value: string | string[];
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      value = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      value = [String(row.value)];
    }
    return {
      participantId: row.participant_id,
      choices: Array.isArray(value) ? value : [value],
      createdAt: row.created_at,
    };
  });

  // 6. Build choice label map
  const choiceLabels: Record<string, string> = {};
  const choiceEligibility: Record<string, string> = {};
  for (const c of choicesMeta) {
    choiceLabels[c.id] = c.label;
    choiceEligibility[c.id] = c.eligibility;
  }

  // 7. Aggregate choice distribution
  const choiceCounts: Record<string, number> = {};
  for (const r of responses) {
    for (const choice of r.choices) {
      choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
    }
  }

  // Include all configured choices (even with 0 responses)
  const allChoiceIds = new Set([
    ...Object.keys(choiceCounts),
    ...choicesMeta.map(c => c.id),
  ]);

  const totalResponses = responses.length;
  const choiceDistribution = Array.from(allChoiceIds).map(choiceId => ({
    choiceId,
    label: choiceLabels[choiceId] || choiceId,
    eligibility: choiceEligibility[choiceId] || 'Qualify',
    count: choiceCounts[choiceId] || 0,
    percentage: totalResponses > 0 ? Math.round(((choiceCounts[choiceId] || 0) / totalResponses) * 100 * 10) / 10 : 0,
  }));

  // 8. Count qualified vs disqualified from responses (based on choice eligibility)
  let qualifiedFromResponses = 0;
  let disqualifiedFromResponses = 0;
  for (const r of responses) {
    const isDisqualified = r.choices.some((c: string) => choiceEligibility[c] === 'Disqualify');
    if (isDisqualified) {
      disqualifiedFromResponses++;
    } else {
      qualifiedFromResponses++;
    }
  }

  // Use participants table counts if available, otherwise fall back to response-based
  const disqualified = statusCounts['disqualified'] || disqualifiedFromResponses;
  const overquota = statusCounts['overquota'] || 0;
  const complete = statusCounts['responded'] || qualifiedFromResponses;

  // 9. Daily distribution (last 30 days)
  const dailyDistribution: Array<{ date: string; count: number; byChoice: Record<string, number> }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayResponses = responses.filter(r => {
      const responseDate = new Date(r.createdAt).toISOString().split('T')[0];
      return responseDate === dateStr;
    });

    const byChoice: Record<string, number> = {};
    for (const r of dayResponses) {
      for (const choice of r.choices) {
        const label = choiceLabels[choice] || choice;
        byChoice[label] = (byChoice[label] || 0) + 1;
      }
    }

    dailyDistribution.push({
      date: dateStr,
      count: dayResponses.length,
      byChoice,
    });
  }

  // 10. Best and slowest day
  const daysWithData = dailyDistribution.filter(d => d.count > 0);
  let bestDay = null;
  let slowestDay = null;
  if (daysWithData.length > 0) {
    const sorted = [...daysWithData].sort((a, b) => b.count - a.count);
    const best = sorted[0];
    const slowest = sorted[sorted.length - 1];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const bestDate = new Date(best.date);
    bestDay = {
      date: best.date,
      dayName: dayNames[bestDate.getDay()],
      hour: '2:00 AM', // Approximate peak — would need hourly data for precision
      count: best.count,
      percentage: totalResponses > 0 ? Math.round((best.count / totalResponses) * 100 * 10) / 10 : 0,
    };

    const slowestDate = new Date(slowest.date);
    slowestDay = {
      date: slowest.date,
      dayName: dayNames[slowestDate.getDay()],
      hour: '6:00 AM',
      count: slowest.count,
      percentage: totalResponses > 0 ? Math.round((slowest.count / totalResponses) * 100 * 10) / 10 : 0,
    };
  }

  // 11. Weekly time series (last 7 days)
  const weeklyTimeSeries = dailyDistribution.slice(-7).map(d => {
    const date = new Date(d.date);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return {
      date: d.date,
      dayName: dayNames[date.getDay()],
      count: d.count,
    };
  });

  return {
    totalResponses,
    qualified: complete,
    disqualified,
    overquota,
    questionText,
    choiceDistribution,
    dailyDistribution,
    bestDay,
    slowestDay,
    weeklyTimeSeries,
  };
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getModuleResponseCount = async (researchId: string, moduleId: string): Promise<number> => {
  const query = `SELECT COUNT(*) as cnt FROM responses WHERE research_id = ? AND module_id = ?`;
  const result = await pool.query(query, [researchId, moduleId]);
  return (result.rows[0] as { cnt: number }).cnt;
};

const getModuleResponses = async (researchId: string, moduleId: string) => {
  const query = `
    SELECT
      r.component_id,
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id
    FROM responses r
    WHERE r.research_id = ? AND r.module_id = ?
    ORDER BY r.created_at ASC
  `;

  const result = await pool.query(query, [researchId, moduleId]);
  const { analyzeSentiment } = await import('../sentiment/sentiment.service');

  return result.rows.map(row => {
    const meta = typeof row.metadata === 'string' ? (() => { try { return JSON.parse(row.metadata); } catch { return {}; } })() : (row.metadata ?? {});
    // Compute sentiment on-the-fly for text responses without stored sentiment
    if ((row.component_id === 'answer' || row.component_id === 'text') && !meta.sentiment) {
      const text = typeof row.value === 'string' ? row.value : '';
      if (text.trim().length > 0) {
        meta.sentiment = analyzeSentiment(text).sentiment;
      }
    }
    return {
      componentId: row.component_id,
      value: row.value,
      metadata: meta,
      createdAt: row.created_at,
      participantId: row.participant_id,
    };
  });
};

// ==========================================
// SMARTVOC RESULTS
// ==========================================

export const getSmartVOCResults = async (researchId: string) => {
  // Extract question texts from SmartVOC module configs
  const modulesQuery = `
    SELECT m.id, m.name, m.config
    FROM modules m
    LEFT JOIN stages s ON s.id = m.stage_id
    WHERE m.research_id = ?
      AND (
        s.name LIKE '%smart voc%'
        OR m.name LIKE '%csat%'
        OR m.name LIKE '%nps%'
        OR m.name LIKE '%ces%'
        OR m.name LIKE '%cv%'
        OR m.name LIKE '%nev%'
        OR m.name LIKE '%voc%'
      )
  `;
  const modulesResult = await pool.query(modulesQuery, [researchId]);
  const questionTexts: Record<string, string> = {};
  // Scale configs extracted from module settings (e.g. CES scale 1-5, 1-7, 1-10)
  const scaleConfigs: Record<string, { min: number; max: number }> = {};
  for (const mod of modulesResult.rows) {
    const key = mod.name.toLowerCase();
    try {
      const config = typeof mod.config === 'string' ? JSON.parse(mod.config) : mod.config;
      const structure = config?.structure ?? config;
      const type =
        key.includes('csat') ? 'csat' :
        key.includes('ces') ? 'ces' :
        key.includes('nps') ? 'nps' :
        key.includes('cv') && !key.includes('nev') ? 'cv' :
        key.includes('nev') ? 'nev' :
        key.includes('voc') ? 'voc' : null;
      if (!type) continue;
      // SmartVOC modules use {type}-title (e.g. csat-title), Cognitive uses question-title
      const titleComponent = structure?.components?.find((c: { id: string }) =>
        c.id === `${type}-title` || c.id === 'question-title'
      );
      const text = titleComponent?.value || titleComponent?.placeholder?.text || '';
      if (text) {
        questionTexts[type] = text;
      }
      // Extract scale range for CES/CV (comp.value > selectRange.predefined > default)
      if (type === 'ces' || type === 'cv') {
        const scaleComp = structure?.components?.find((c: { id: string }) => c.id === `${type}-scale`);
        if (scaleComp) {
          const rangeStr = scaleComp.value || scaleComp.selectRange?.predefined || '1-5';
          const [minStr, maxStr] = String(rangeStr).split('-');
          const parsedMin = parseInt(minStr, 10);
          const parsedMax = parseInt(maxStr, 10);
          if (!isNaN(parsedMin) && !isNaN(parsedMax)) {
            scaleConfigs[type] = { min: parsedMin, max: parsedMax };
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Get all responses for SmartVOC modules
  const responsesQuery = `
    SELECT 
      r.module_id,
      r.component_id,
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id,
      m.name as module_name
    FROM responses r
    INNER JOIN modules m ON r.module_id = m.id
    LEFT JOIN stages s ON s.id = m.stage_id
    WHERE r.research_id = ? 
      AND (
        s.name LIKE '%smart voc%'
        OR m.name LIKE '%csat%'
        OR m.name LIKE '%nps%'
        OR m.name LIKE '%ces%'
        OR m.name LIKE '%cv%'
        OR m.name LIKE '%nev%'
        OR m.name LIKE '%voc%'
      )
    ORDER BY r.created_at ASC
  `;
  const responsesResult = await pool.query(responsesQuery, [researchId]);

  // Process responses by type — each score includes its timestamp and participantId for frontend filtering
  const csatScores: Array<{ value: number; date: string; participantId: string }> = [];
  const cesScores: Array<{ value: number; date: string; participantId: string }> = [];
  const npsScores: Array<{ value: number; date: string; participantId: string }> = [];
  const cvScores: Array<{ value: number; date: string; participantId: string }> = [];
  const nevScores: number[] = [];
  const vocResponses: Array<{ text: string; sentiment?: string; participantId: string; createdAt: string }> = [];
  const emotionalStates: Record<string, number> = {};
  const nevResponsesData: Array<{ emotions: string[]; date: string; participantId: string }> = [];
  const { analyzeSentiment: analyzeSentimentFn } = await import('../sentiment/sentiment.service');

  for (const row of responsesResult.rows) {
    const moduleName = row.module_name.toLowerCase();
    const value = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);

    try {
      // CSAT (scale 1-5)
      if (moduleName.includes('csat')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          csatScores.push({ value: score, date: row.created_at, participantId: row.participant_id });
        }
      }
      // CES (scale 1-5, 1-7, or 1-10 depending on config)
      else if (moduleName.includes('ces')) {
        const score = parseInt(value);
        const cesMax = scaleConfigs.ces?.max ?? 5;
        if (!isNaN(score) && score >= 1 && score <= cesMax) {
          cesScores.push({ value: score, date: row.created_at, participantId: row.participant_id });
        }
      }
      // NPS (scale 0-10)
      else if (moduleName.includes('nps')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 0 && score <= 10) {
          npsScores.push({ value: score, date: row.created_at, participantId: row.participant_id });
        }
      }
      // CV (scale 1-5)
      else if (moduleName.includes('cv')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          cvScores.push({ value: score, date: row.created_at, participantId: row.participant_id });
        }
      }
      // NEV (emotional states array)
      else if (moduleName.includes('nev')) {
        let emotions: string[] = [];
        try {
          const parsed = JSON.parse(value);
          emotions = Array.isArray(parsed) ? parsed : [];
        } catch {
          // Value might already be an array
          emotions = [];
        }

        // Count emotional states (normalized keys so no records lost; matches participant IDs)
        emotions.forEach((emotion: string) => {
          const key = normalizeEmotionKey(emotion);
          emotionalStates[key] = (emotionalStates[key] || 0) + 1;
        });

        // Store per-response data with timestamp and participantId for frontend filtering
        if (emotions.length > 0) {
          nevResponsesData.push({ emotions, date: row.created_at, participantId: row.participant_id });
        }

        // Calculate NEV score (normalize so e.g. "Enérgico" / "energico" count as positive)
        const positiveCount = emotions.filter((e: string) => POSITIVE_EMOTIONS.includes(normalizeEmotionKey(e))).length;
        const negativeCount = emotions.length - positiveCount;

        if (emotions.length > 0) {
          const nevScore = Math.round(((positiveCount - negativeCount) / emotions.length) * 100);
          nevScores.push(nevScore);
        }
      }
      // VOC (text responses)
      else if (moduleName.includes('voc')) {
        // Read sentiment from metadata (saved at response time) or compute on the fly
        let sentiment: string | undefined;
        try {
          const meta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
          sentiment = meta?.sentiment;
        } catch { /* ignore */ }
        if (!sentiment && value.trim().length > 0) {
          sentiment = analyzeSentimentFn(value).sentiment;
        }
        vocResponses.push({
          text: value,
          sentiment,
          participantId: row.participant_id,
          createdAt: row.created_at
        });
      }
    } catch (error) {
      console.error('Error processing SmartVOC response:', error);
    }
  }

  // Calculate metrics — extract raw values for aggregate calculations
  const totalResponses = responsesResult.rows.length;
  const uniqueParticipants = new Set(responsesResult.rows.map(r => r.participant_id)).size;

  const npsValues = npsScores.map(s => s.value);
  const csatValues = csatScores.map(s => s.value);
  const cesValues = cesScores.map(s => s.value);

  // NPS calculation
  const promoters = npsValues.filter(s => s >= 9).length;
  const passives = npsValues.filter(s => s >= 7 && s <= 8).length;
  const detractors = npsValues.filter(s => s <= 6).length;
  const npsScore = npsValues.length > 0
    ? Math.round(((promoters - detractors) / npsValues.length) * 100)
    : 0;

  // CSAT & CES percentages
  const csatPercentage = csatValues.length > 0
    ? Math.round((csatValues.filter(s => s >= 4).length / csatValues.length) * 100)
    : 0;
  const cesPercentage = cesValues.length > 0
    ? Math.round((cesValues.filter(s => s <= 2).length / cesValues.length) * 100)
    : 0;

  // CPV calculation
  const cpvValue = cesPercentage > 0 ? Math.round((csatPercentage / cesPercentage) * 100) / 100 : 0;

  // Time series data (last 30 days, daily granularity)
  const timeSeriesData = generateTimeSeriesData(responsesResult.rows);

  // Intraday time series data (last 24 hours, 30-min intervals = 48 bars)
  const intradayTimeSeriesData = generateIntradayTimeSeriesData(responsesResult.rows);

  // Monthly NPS data (last 6 months)
  const monthlyNPSData = generateMonthlyNPSData(responsesResult.rows);

  // Monthly metrics data for CSAT/CES/CV/CPV charts (last 6 months)
  const monthlyMetricsData = generateMonthlyMetricsData(responsesResult.rows);

  return {
    totalResponses,
    uniqueParticipants,
    metrics: {
      cpvValue,
      satisfaction: csatPercentage,
      retention: Math.round(((promoters + passives) / Math.max(npsValues.length, 1)) * 100),
      npsScore,
      promoters,
      neutrals: passives,
      detractors,
      csatScores,
      cesScores,
      cvScores,
      npsScores,
      impact: promoters > detractors ? 'High' : totalResponses > 0 ? 'Medium' : 'Low',
      trend: promoters > detractors ? 'Increasing' : totalResponses > 0 ? 'Stable' : 'Decreasing'
    },
    timeSeriesData,
    intradayTimeSeriesData,
    vocResponses,
    monthlyNPSData,
    monthlyMetricsData,
    emotionalStates,
    nevResponsesData,
    questionTexts,
    scaleConfigs
  };
};

// Canonical NEV emotion IDs (lowercase, no accents) — match participant-frontend EmotionSelector
const POSITIVE_EMOTIONS = [
  'feliz', 'satisfecho', 'confiado', 'valorado', 'cuidado', 'seguro',
  'enfocado', 'indulgente', 'estimulado', 'exploratorio', 'interesado', 'energico'
];
const NEGATIVE_EMOTIONS = [
  'descontento', 'frustrado', 'irritado', 'decepcion', 'estresado', 'infeliz', 'desatendido', 'apresurado'
];

/** Normalize emotion key for NEV (lowercase, remove accents) so participant submissions match canonical list. */
function normalizeEmotionKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0301/g, '')
    .replace(/\u0300/g, '')
    .replace(/[\u0302\u0303\u0308]/g, '');
}

/**
 * Parse a response value to integer score, handling both string and non-string values
 */
const parseScoreValue = (value: unknown): number => {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  return parseInt(raw);
};

/**
 * Filter responses by module name pattern and parse scores
 */
const extractScores = (responses: any[], modulePattern: string, minValid = -Infinity, maxValid = Infinity): number[] => {
  return responses
    .filter(r => r.module_name.toLowerCase().includes(modulePattern))
    .map(r => parseScoreValue(r.value))
    .filter(s => !isNaN(s) && s >= minValid && s <= maxValid);
};

/**
 * Calculate NPS from an array of 0-10 scores
 */
const calculateNPSFromScores = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
};

/**
 * Calculate NEV from responses that contain emotion arrays
 */
const calculateNEVFromResponses = (nevResponses: any[]): number => {
  if (nevResponses.length === 0) return 0;

  let totalPositive = 0;
  let totalNegative = 0;
  let totalEmotions = 0;

  nevResponses.forEach(r => {
    const value = typeof r.value === 'string' ? r.value : JSON.stringify(r.value);
    let emotions: string[] = [];
    try {
      const parsed = JSON.parse(value);
      emotions = Array.isArray(parsed) ? parsed : [];
    } catch {
      emotions = [];
    }

    if (emotions.length > 0) {
      const positive = emotions.filter((e: string) => POSITIVE_EMOTIONS.includes(normalizeEmotionKey(e))).length;
      totalPositive += positive;
      totalNegative += emotions.length - positive;
      totalEmotions += emotions.length;
    }
  });

  if (totalEmotions === 0) return 0;
  return Math.round(((totalPositive - totalNegative) / totalEmotions) * 100);
};

/**
 * Calculate CSAT percentage from 1-5 scores: (scores >= 4) / total * 100
 */
const calculateCSATPercentage = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  return Math.round((scores.filter(s => s >= 4).length / scores.length) * 100);
};

/**
 * Calculate CES percentage from 1-5 scores: (scores <= 2) / total * 100
 */
const calculateCESPercentage = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  return Math.round((scores.filter(s => s <= 2).length / scores.length) * 100);
};

// Helper: Generate time series data (last 30 days to support all time range filters)
const generateTimeSeriesData = (responses: any[]) => {
  const days = [];
  const today = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayResponses = responses.filter(r => {
      const responseDate = new Date(r.created_at).toISOString().split('T')[0];
      return responseDate === dateStr;
    });

    // NPS
    const dayNPSScores = extractScores(dayResponses, 'nps', 0, 10);
    const nps = calculateNPSFromScores(dayNPSScores);

    // NEV
    const dayNEVResponses = dayResponses.filter(r => r.module_name.toLowerCase().includes('nev'));
    const nev = calculateNEVFromResponses(dayNEVResponses);

    // CSAT
    const dayCSATScores = extractScores(dayResponses, 'csat', 1, 5);
    const csat = calculateCSATPercentage(dayCSATScores);

    // CES
    const dayCESScores = extractScores(dayResponses, 'ces', 1, 10);
    const ces = calculateCESPercentage(dayCESScores);

    // CV
    const dayCVScores = extractScores(dayResponses, 'cv', 1, 5);
    const cv = dayCVScores.length > 0
      ? Math.round((dayCVScores.filter(s => s >= 4).length / dayCVScores.length) * 100)
      : 0;

    // CPV = CSAT% / CES% (only meaningful when both exist)
    const cpv = ces > 0 ? Math.round((csat / ces) * 100) / 100 : 0;

    days.push({
      date: dateStr,
      nps,
      nev,
      csat,
      ces,
      cv,
      cpv,
      count: dayResponses.length
    });
  }

  return days;
};

// Helper: Generate intraday time series data (last 24 hours, 30-min intervals = 48 bars)
const generateIntradayTimeSeriesData = (responses: any[]) => {
  const slots = [];
  const now = new Date();
  // Start 24 hours ago, rounded down to nearest 30-min boundary
  const start = new Date(now);
  start.setHours(start.getHours() - 24);
  start.setMinutes(start.getMinutes() >= 30 ? 30 : 0, 0, 0);

  for (let i = 0; i < 48; i++) {
    const slotStart = new Date(start.getTime() + i * 30 * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

    const slotResponses = responses.filter(r => {
      const d = new Date(r.created_at);
      return d >= slotStart && d < slotEnd;
    });

    // NPS
    const npsScores = extractScores(slotResponses, 'nps', 0, 10);
    const nps = calculateNPSFromScores(npsScores);

    // NEV
    const nevResponses = slotResponses.filter(r => r.module_name.toLowerCase().includes('nev'));
    const nev = calculateNEVFromResponses(nevResponses);

    // CSAT
    const csatScores = extractScores(slotResponses, 'csat', 1, 5);
    const csat = calculateCSATPercentage(csatScores);

    // CES
    const cesScores = extractScores(slotResponses, 'ces', 1, 10);
    const ces = calculateCESPercentage(cesScores);

    // CV
    const cvScores = extractScores(slotResponses, 'cv', 1, 5);
    const cv = cvScores.length > 0
      ? Math.round((cvScores.filter(s => s >= 4).length / cvScores.length) * 100)
      : 0;

    // CPV
    const cpv = ces > 0 ? Math.round((csat / ces) * 100) / 100 : 0;

    // Label: HH:MM
    const label = `${String(slotStart.getHours()).padStart(2, '0')}:${String(slotStart.getMinutes()).padStart(2, '0')}`;

    slots.push({
      date: slotStart.toISOString(),
      label,
      nps,
      nev,
      csat,
      ces,
      cv,
      cpv,
      count: slotResponses.length
    });
  }

  return slots;
};

// Helper: Generate monthly NPS data (last 6 months)
const generateMonthlyNPSData = (responses: any[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyData = [];

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const monthResponses = responses.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear
        && r.module_name.toLowerCase().includes('nps');
    });

    const scores = monthResponses
      .map(r => parseScoreValue(r.value))
      .filter(s => !isNaN(s) && s >= 0 && s <= 10);

    const promoters = scores.filter(s => s >= 9).length;
    const passives = scores.filter(s => s >= 7 && s <= 8).length;
    const detractors = scores.filter(s => s <= 6).length;
    const total = scores.length || 1;

    monthlyData.push({
      month: monthNames[targetMonth],
      promoters: Math.round((promoters / total) * 100),
      neutrals: Math.round((passives / total) * 100),
      detractors: Math.round((detractors / total) * 100),
      npsRatio: Math.round(((promoters - detractors) / total) * 100),
      date: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
    });
  }

  return monthlyData;
};

// Helper: Generate monthly metrics data for CSAT/CES/CV/CPV charts (last 6 months)
const generateMonthlyMetricsData = (responses: any[]) => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const monthlyData = [];

  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    // Filter all responses for this month
    const monthResponses = responses.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    // CSAT
    const csatScores = extractScores(monthResponses, 'csat', 1, 5);
    const csatSatisfied = csatScores.length > 0
      ? Math.round((csatScores.filter(s => s >= 4).length / csatScores.length) * 100) : 0;
    const csatDissatisfied = csatScores.length > 0
      ? Math.round((csatScores.filter(s => s <= 2).length / csatScores.length) * 100) : 0;

    // CES
    const cesScores = extractScores(monthResponses, 'ces', 1, 10);
    const cesPositive = cesScores.length > 0
      ? Math.round((cesScores.filter(s => s <= 2).length / cesScores.length) * 100) : 0;
    const cesNegative = cesScores.length > 0
      ? Math.round((cesScores.filter(s => s >= 4).length / cesScores.length) * 100) : 0;

    // CV
    const cvScores = extractScores(monthResponses, 'cv', 1, 5);
    const cvPositive = cvScores.length > 0
      ? Math.round((cvScores.filter(s => s >= 4).length / cvScores.length) * 100) : 0;
    const cvNegative = cvScores.length > 0
      ? Math.round((cvScores.filter(s => s <= 2).length / cvScores.length) * 100) : 0;

    // CPV
    const cpv = cesPositive > 0 ? Math.round((csatSatisfied / cesPositive) * 100) / 100 : 0;

    monthlyData.push({
      month: monthNames[targetMonth],
      date: `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`,
      csatSatisfied,
      csatDissatisfied,
      cesPositive,
      cesNegative,
      cvPositive,
      cvNegative,
      cpv
    });
  }

  return monthlyData;
};

// ==========================================
// IMPLICIT ASSOCIATION RESULTS
// ==========================================

interface IATTarget {
  id: string;
  name: string;
  imageUrl?: string;
}

interface IATAttribute {
  id: string;
  label: string;
  /** Target assigned to this criterion (Attribute Testing only) */
  targetId?: string;
}

/** Greenwald D-score effect size interpretation */
type DScoreEffect = 'none' | 'slight' | 'moderate' | 'strong';

interface DScoreResult {
  /** Greenwald D-score value */
  value: number;
  /** Effect interpretation */
  effect: DScoreEffect;
  /** Number of valid participants used */
  validParticipants: number;
  /** 95% CI lower bound */
  ciLower: number;
  /** 95% CI upper bound */
  ciUpper: number;
}

interface IATParticipantData {
  participantId: string;
  /** Mean RT per (criterionId, targetId) combination */
  rtByCombination: Record<string, number>;
  /** Total trials in test phase */
  totalTrials: number;
  /** Trials with RT < 300ms (too fast) */
  fastTrials: number;
  /** Accuracy (correct / total) */
  accuracy: number;
  /** Quality flag: 'good' | 'fast_responses' | 'low_accuracy' | 'insufficient_data' */
  quality: 'good' | 'fast_responses' | 'low_accuracy' | 'insufficient_data';
  /** Segmentation: strongest associated target per criterion */
  segmentation: Record<string, string>;
  /** Individual Greenwald D-score (per target pair for Objects Comparing) */
  dScore?: number;
  dScoreEffect?: DScoreEffect;
}

interface IATModuleResult {
  moduleId: string;
  moduleName: string;
  testTitle?: string;
  testType: 'attribute_testing' | 'comparing_attribute' | 'objects_comparing';
  primingTime: number;
  targets: IATTarget[];
  attributes: IATAttribute[];
  totalResponses: number;
  scores: Array<{
    attributeId: string;
    attributeLabel: string;
    targetScores: Record<string, number>;
  }>;
  participantData?: IATParticipantData[];
  /** Greenwald D-score aggregate (Objects Comparing / Attribute Testing) */
  dScore?: DScoreResult;
  /** Error analysis per block and per combination */
  errorAnalysis?: {
    /** Error rate per phase (practice vs test) */
    byPhase: Array<{ phase: string; total: number; errors: number; errorRate: number }>;
    /** Error rate per target-attribute combination */
    byCombination: Array<{ targetId: string; targetName: string; attributeId: string; attributeLabel: string; total: number; errors: number; errorRate: number }>;
    /** Overall error rate */
    overallErrorRate: number;
    /** Overall fast response rate */
    overallFastRate: number;
  };
}

/**
 * Detect the IAT test type from the module template name
 */
const detectIATTestType = (moduleName: string): IATModuleResult['testType'] => {
  const lower = moduleName.toLowerCase();
  if (lower.includes('comparing attribute') || lower.includes('comparing attr')) return 'comparing_attribute';
  if (lower.includes('objects comparing') || lower.includes('object comparing')) return 'objects_comparing';
  return 'attribute_testing';
};

/**
 * Extract IAT configuration (targets, attributes, priming) from module config
 */
const extractIATConfig = (config: any, testType: IATModuleResult['testType']) => {
  const structure = config?.structure ?? config;
  const components: any[] = structure?.components ?? [];

  const primingComp = components.find((c: any) => c.id === 'priming-time');
  const primingTime = parseInt(primingComp?.value || '400', 10);

  const targets: IATTarget[] = [];
  const attributes: IATAttribute[] = [];

  if (testType === 'comparing_attribute') {
    // Comparing Attribute: object-N-name, object-N-image, dimension-1, dimension-2, criteria list
    for (let i = 1; i <= 20; i++) {
      const nameComp = components.find((c: any) => c.id === `object-${i}-name`);
      if (!nameComp) continue;
      if (nameComp.value) {
        const imageComp = components.find((c: any) => c.id === `object-${i}-image`);
        targets.push({
          id: `object-${i}`,
          name: nameComp.value,
          imageUrl: imageComp?.value || undefined,
        });
      }
    }
    // Dimensions become the "attributes" axis (2 dimensions)
    const dim1 = components.find((c: any) => c.id === 'dimension-1');
    const dim2 = components.find((c: any) => c.id === 'dimension-2');
    if (dim1?.value || dim1?.placeholder?.text) {
      attributes.push({ id: 'dimension-1', label: dim1.value || dim1.placeholder.text });
    }
    if (dim2?.value || dim2?.placeholder?.text) {
      attributes.push({ id: 'dimension-2', label: dim2.value || dim2.placeholder.text });
    }
  } else {
    // Attribute Testing / Objects Comparing: target-N-name, target-N-image, criteria list
    for (let i = 1; i <= 20; i++) {
      const nameComp = components.find((c: any) => c.id === `target-${i}-name`);
      if (!nameComp) continue;
      if (nameComp.value) {
        const imageComp = components.find((c: any) => c.id === `target-${i}-image`);
        targets.push({
          id: `target-${i}`,
          name: nameComp.value,
          imageUrl: imageComp?.value || undefined,
        });
      }
    }
    // Criteria list from ranking-list component
    const criteriaComp = components.find((c: any) => c.id === 'criteria');
    if (criteriaComp?.value) {
      const items = typeof criteriaComp.value === 'string'
        ? JSON.parse(criteriaComp.value)
        : criteriaComp.value;
      const list = Array.isArray(items) ? items : items?.items ?? [];
      for (const item of list) {
        if (item.hidden) continue;
        const label = (item.label || item.text || item.value || item.name || '').toString().trim();
        if (!label) continue;
        attributes.push({
          id: item.id || item.value || String(list.indexOf(item)),
          label: label || `Attribute ${list.indexOf(item) + 1}`,
          targetId: item.targetId || undefined,
        });
      }
    }

    // Objects Comparing template: Positive/Negative inputs when ranking list produced no items
    if (testType === 'objects_comparing' && attributes.length === 0) {
      const c1 = components.find((c: any) => c.id === 'criteria-1');
      const c2 = components.find((c: any) => c.id === 'criteria-2');
      const l1 = (c1?.value ?? c1?.placeholder?.text ?? '').toString().trim();
      const l2 = (c2?.value ?? c2?.placeholder?.text ?? '').toString().trim();
      if (l1 && l2) {
        attributes.length = 0;
        attributes.push({ id: 'criteria-1', label: l1 });
        attributes.push({ id: 'criteria-2', label: l2 });
      }
    }
  }

  return { primingTime, targets, attributes };
};

/**
 * Compute IAT scores from trial-level response data.
 * Each response has component_id='iat-trials' and value = JSON array of trials:
 * [{ targetId, criterionId, rt, correct, phase }]
 *
 * Score per (attribute, target) = association strength based on reaction times.
 * D-score approach: (mean_RT_incongruent - mean_RT_congruent) / pooled_SD,
 * then scaled to -100..100 range.
 *
 * When no data: returns 0 for all scores.
 */
const computeIATScores = (
  responses: any[],
  targets: IATTarget[],
  attributes: IATAttribute[],
  testType: IATModuleResult['testType'],
): IATModuleResult['scores'] => {
  // Parse all trials from all responses
  type Trial = { targetId: string; criterionId: string; rt: number; correct: boolean; phase: string };
  const allTrials: Trial[] = [];

  for (const row of responses) {
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      const trials: Trial[] = Array.isArray(parsed) ? parsed : parsed?.trials ?? [];
      // Only include test-phase trials (exclude exercise/practice)
      for (const t of trials) {
        if (t.phase === 'test' && t.correct !== false) {
          allTrials.push(t);
        }
      }
    } catch { /* skip malformed */ }
  }

  // Group trials by (criterionId, targetId) → array of reaction times
  const rtMap: Record<string, Record<string, number[]>> = {};
  for (const t of allTrials) {
    if (!rtMap[t.criterionId]) rtMap[t.criterionId] = {};
    if (!rtMap[t.criterionId][t.targetId]) rtMap[t.criterionId][t.targetId] = [];
    rtMap[t.criterionId][t.targetId].push(t.rt);
  }

  // Compute overall mean RT and SD for normalization
  const allRTs = allTrials.map(t => t.rt);
  const overallMean = allRTs.length > 0 ? allRTs.reduce((a, b) => a + b, 0) / allRTs.length : 0;
  const overallSD = allRTs.length > 1
    ? Math.sqrt(allRTs.reduce((sum, rt) => sum + (rt - overallMean) ** 2, 0) / (allRTs.length - 1))
    : 1;

  return attributes.map(attr => {
    const targetScores: Record<string, number> = {};

    for (const target of targets) {
      const rts = rtMap[attr.id]?.[target.id] ?? [];
      if (rts.length === 0 || overallSD === 0) {
        targetScores[target.id] = 0;
        continue;
      }
      const meanRT = rts.reduce((a, b) => a + b, 0) / rts.length;
      // D-score: how much faster/slower than overall mean, normalized by SD, scaled to -100..100
      // Negative score = faster than average (stronger association)
      const dScore = (overallMean - meanRT) / overallSD;
      // Clamp to -100..100
      targetScores[target.id] = Math.max(-100, Math.min(100, Math.round(dScore * 50)));
    }

    return {
      attributeId: attr.id,
      attributeLabel: attr.label,
      targetScores,
    };
  });
};

// ---------------------------------------------------------------------------
// Greenwald D-score algorithm (Greenwald, Nosek & Banaji, 2003)
// ---------------------------------------------------------------------------

function classifyDScoreEffect(d: number): DScoreEffect {
  const abs = Math.abs(d);
  if (abs < 0.15) return 'none';
  if (abs < 0.35) return 'slight';
  if (abs < 0.65) return 'moderate';
  return 'strong';
}

/**
 * Compute Greenwald improved D-score for one participant.
 * Compatible blocks = target1+positive / target2+negative (or equivalent).
 * Incompatible blocks = swapped.
 *
 * For Attribute Testing: compatible = target matched with assigned criterion,
 *   incompatible = target matched with non-assigned criterion.
 * For Objects Comparing: classic IAT 7-block design.
 *
 * @param compatibleRTs - reaction times from compatible block
 * @param incompatibleRTs - reaction times from incompatible block
 * @returns D-score or null if insufficient data
 */
function computeGreenwaldDScore(compatibleRTs: number[], incompatibleRTs: number[]): number | null {
  // Step 1: Remove trials > 10,000ms
  const filteredCompat = compatibleRTs.filter(rt => rt <= 10000);
  const filteredIncompat = incompatibleRTs.filter(rt => rt <= 10000);

  if (filteredCompat.length < 2 || filteredIncompat.length < 2) return null;

  // Step 2: Compute means
  const meanCompat = filteredCompat.reduce((a, b) => a + b, 0) / filteredCompat.length;
  const meanIncompat = filteredIncompat.reduce((a, b) => a + b, 0) / filteredIncompat.length;

  // Step 3: Pooled SD across both blocks
  const allRTs = [...filteredCompat, ...filteredIncompat];
  const allMean = allRTs.reduce((a, b) => a + b, 0) / allRTs.length;
  const pooledSD = Math.sqrt(
    allRTs.reduce((sum, rt) => sum + (rt - allMean) ** 2, 0) / (allRTs.length - 1)
  );

  if (pooledSD === 0) return null;

  // Step 4: D = (mean_incompatible - mean_compatible) / pooled_SD
  return (meanIncompat - meanCompat) / pooledSD;
}

/**
 * Compute aggregate D-score with 95% CI from individual participant D-scores.
 */
function computeAggregateDScore(individualDScores: number[]): DScoreResult | undefined {
  const valid = individualDScores.filter(d => Number.isFinite(d));
  if (valid.length < 2) {
    if (valid.length === 1) {
      return {
        value: Math.round(valid[0] * 1000) / 1000,
        effect: classifyDScoreEffect(valid[0]),
        validParticipants: 1,
        ciLower: valid[0],
        ciUpper: valid[0],
      };
    }
    return undefined;
  }

  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const sd = Math.sqrt(valid.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (valid.length - 1));
  const se = sd / Math.sqrt(valid.length);
  // t-distribution approximation for 95% CI (use 1.96 for large N, good enough)
  const tCrit = valid.length >= 30 ? 1.96 : 2.0;

  return {
    value: Math.round(mean * 1000) / 1000,
    effect: classifyDScoreEffect(mean),
    validParticipants: valid.length,
    ciLower: Math.round((mean - tCrit * se) * 1000) / 1000,
    ciUpper: Math.round((mean + tCrit * se) * 1000) / 1000,
  };
}

/**
 * Compute error analysis from all IAT trial data.
 */
const computeIATErrorAnalysis = (
  responses: any[],
  targets: IATTarget[],
  attributes: IATAttribute[],
) => {
  type Trial = { targetId: string; criterionId: string; rt: number; correct: boolean; phase: string };
  const allTrials: Trial[] = [];

  for (const row of responses) {
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      const trials: Trial[] = Array.isArray(parsed) ? parsed : parsed?.trials ?? [];
      allTrials.push(...trials);
    } catch { /* skip */ }
  }

  if (allTrials.length === 0) return undefined;

  // By phase
  const phaseMap = new Map<string, { total: number; errors: number }>();
  for (const t of allTrials) {
    const p = t.phase || 'unknown';
    if (!phaseMap.has(p)) phaseMap.set(p, { total: 0, errors: 0 });
    const entry = phaseMap.get(p)!;
    entry.total++;
    if (t.correct === false) entry.errors++;
  }
  const byPhase = Array.from(phaseMap.entries()).map(([phase, data]) => ({
    phase,
    total: data.total,
    errors: data.errors,
    errorRate: Math.round((data.errors / data.total) * 10000) / 100,
  }));

  // By combination
  const comboMap = new Map<string, { total: number; errors: number }>();
  for (const t of allTrials) {
    const key = `${t.targetId}×${t.criterionId}`;
    if (!comboMap.has(key)) comboMap.set(key, { total: 0, errors: 0 });
    const entry = comboMap.get(key)!;
    entry.total++;
    if (t.correct === false) entry.errors++;
  }

  const targetMap = new Map(targets.map(t => [t.id, t.name]));
  const attrMap = new Map(attributes.map(a => [a.id, a.label]));

  const byCombination = Array.from(comboMap.entries())
    .map(([key, data]) => {
      const [targetId, attributeId] = key.split('×');
      return {
        targetId,
        targetName: targetMap.get(targetId) || targetId,
        attributeId,
        attributeLabel: attrMap.get(attributeId) || attributeId,
        total: data.total,
        errors: data.errors,
        errorRate: Math.round((data.errors / data.total) * 10000) / 100,
      };
    })
    .sort((a, b) => b.errorRate - a.errorRate);

  const totalErrors = allTrials.filter(t => t.correct === false).length;
  const totalFast = allTrials.filter(t => t.rt < 300).length;

  return {
    byPhase,
    byCombination,
    overallErrorRate: Math.round((totalErrors / allTrials.length) * 10000) / 100,
    overallFastRate: Math.round((totalFast / allTrials.length) * 10000) / 100,
  };
};

const FAST_RT_THRESHOLD = 300; // ms — trials below this are suspicious
const MIN_TRIALS_FOR_QUALITY = 5;
const MIN_ACCURACY_THRESHOLD = 0.6; // 60%
const MAX_FAST_RATIO = 0.3; // 30% fast trials = flagged

const computeIATParticipantData = (
  rows: Array<{ value: string | unknown; participant_id: string }>,
  targets: IATTarget[],
  attributes: IATAttribute[],
): IATParticipantData[] => {
  type Trial = { targetId: string; criterionId: string; rt: number; correct: boolean; phase: string };

  // Group trials by participant
  const byParticipant = new Map<string, Trial[]>();
  for (const row of rows) {
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      const trials: Trial[] = Array.isArray(parsed) ? parsed : parsed?.trials ?? [];
      const pid = row.participant_id;
      if (!byParticipant.has(pid)) byParticipant.set(pid, []);
      for (const t of trials) {
        if (t.phase === 'test') byParticipant.get(pid)!.push(t);
      }
    } catch { /* skip */ }
  }

  const result: IATParticipantData[] = [];

  for (const [participantId, trials] of byParticipant) {
    const totalTrials = trials.length;
    const fastTrials = trials.filter(t => t.rt < FAST_RT_THRESHOLD).length;
    const correctTrials = trials.filter(t => t.correct !== false).length;
    const accuracy = totalTrials > 0 ? correctTrials / totalTrials : 0;

    // Quality flag
    let quality: IATParticipantData['quality'] = 'good';
    if (totalTrials < MIN_TRIALS_FOR_QUALITY) {
      quality = 'insufficient_data';
    } else if (fastTrials / totalTrials > MAX_FAST_RATIO) {
      quality = 'fast_responses';
    } else if (accuracy < MIN_ACCURACY_THRESHOLD) {
      quality = 'low_accuracy';
    }

    // Mean RT per (criterionId, targetId) — only correct test trials
    const rtByCombination: Record<string, number> = {};
    const rtAccum: Record<string, number[]> = {};
    for (const t of trials) {
      if (t.correct === false) continue;
      const key = `${t.criterionId}×${t.targetId}`;
      if (!rtAccum[key]) rtAccum[key] = [];
      rtAccum[key].push(t.rt);
    }
    for (const [key, rts] of Object.entries(rtAccum)) {
      rtByCombination[key] = Math.round(rts.reduce((a, b) => a + b, 0) / rts.length);
    }

    // Segmentation: for each criterion, which target has fastest mean RT
    const segmentation: Record<string, string> = {};
    for (const attr of attributes) {
      let bestTarget = '';
      let bestRT = Infinity;
      for (const target of targets) {
        const key = `${attr.id}×${target.id}`;
        const rt = rtByCombination[key];
        if (rt !== undefined && rt < bestRT) {
          bestRT = rt;
          bestTarget = target.id;
        }
      }
      if (bestTarget) segmentation[attr.id] = bestTarget;
    }

    // Greenwald D-score per participant
    // Compatible = criterion paired with its assigned target (correct pairing)
    // Incompatible = criterion paired with non-assigned target
    const compatibleRTs: number[] = [];
    const incompatibleRTs: number[] = [];
    for (const t of trials) {
      if (t.correct === false || t.rt > 10000) continue;
      // Find which target this criterion is assigned to
      const attr = attributes.find(a => a.id === t.criterionId);
      if (!attr) continue;
      const assignedTargetId = attr.targetId;
      if (assignedTargetId) {
        if (t.targetId === assignedTargetId) {
          compatibleRTs.push(t.rt);
        } else {
          incompatibleRTs.push(t.rt);
        }
      } else if (targets.length === 2) {
        // Objects Comparing: first target = compatible, second = incompatible (convention)
        if (t.targetId === targets[0].id) {
          compatibleRTs.push(t.rt);
        } else {
          incompatibleRTs.push(t.rt);
        }
      }
    }

    const dScore = computeGreenwaldDScore(compatibleRTs, incompatibleRTs);

    result.push({
      participantId,
      rtByCombination,
      totalTrials,
      fastTrials,
      accuracy: Math.round(accuracy * 100) / 100,
      quality,
      segmentation,
      dScore: dScore != null ? Math.round(dScore * 1000) / 1000 : undefined,
      dScoreEffect: dScore != null ? classifyDScoreEffect(dScore) : undefined,
    });
  }

  return result;
};

export const getImplicitAssociationResults = async (researchId: string) => {
  // 1. Find the Implicit Association stage
  const stageQuery = `
    SELECT s.id as stage_id, s.name as stage_name
    FROM stages s
    WHERE s.research_id = ?
      AND LOWER(s.name) = 'implicit association'
    LIMIT 1
  `;
  const stageResult = await pool.query(stageQuery, [researchId]);
  if (stageResult.rows.length === 0) {
    return { modules: [] };
  }
  const stageId = stageResult.rows[0].stage_id;

  // 2. Get modules in this stage
  const moduleQuery = `
    SELECT id, name, config FROM modules
    WHERE research_id = ? AND stage_id = ?
    ORDER BY order_index
  `;
  const moduleResult = await pool.query(moduleQuery, [researchId, stageId]);

  const modules: IATModuleResult[] = [];

  for (const mod of moduleResult.rows) {
    const testType = detectIATTestType(mod.name);
    let config: any = {};
    try {
      config = typeof mod.config === 'string' ? JSON.parse(mod.config) : mod.config;
    } catch { /* ignore */ }

    const { primingTime, targets, attributes } = extractIATConfig(config, testType);

    // Extract internal test title
    const structure = config?.structure ?? config;
    const testTitleComp = (structure?.components ?? []).find((c: any) => c.id === 'test-title');
    const testTitle = testTitleComp?.value?.toString().trim() || undefined;

    // 3. Get responses for this module (component_id = 'iat-trials')
    const responsesQuery = `
      SELECT r.value, r.participant_id, r.created_at
      FROM responses r
      WHERE r.research_id = ? AND r.module_id = ? AND r.component_id = 'iat-trials'
      ORDER BY r.created_at ASC
    `;
    const responsesResult = await pool.query(responsesQuery, [researchId, mod.id]);

    const scores = computeIATScores(responsesResult.rows, targets, attributes, testType);

    // D-score and error analysis only apply to paradigms with correct/incorrect trials
    const hasDScore = testType !== 'comparing_attribute';
    const participantData = hasDScore
      ? computeIATParticipantData(responsesResult.rows as Array<{ value: string | unknown; participant_id: string }>, targets, attributes)
      : undefined;

    const dScore = hasDScore && participantData
      ? computeAggregateDScore(
          participantData.filter(p => p.quality === 'good' && p.dScore != null).map(p => p.dScore!)
        )
      : undefined;

    const errorAnalysis = hasDScore
      ? computeIATErrorAnalysis(responsesResult.rows, targets, attributes)
      : undefined;

    modules.push({
      moduleId: mod.id,
      moduleName: mod.name,
      testTitle,
      testType,
      primingTime,
      targets,
      attributes,
      totalResponses: responsesResult.rows.length,
      scores,
      participantData,
      dScore,
      errorAnalysis,
    });
  }

  return { modules };
};

// ==========================================
// EYE TRACKING RESULTS
// ==========================================

type EkmanEmotion = 'joy' | 'sadness' | 'surprise' | 'anger' | 'disgust' | 'fear' | 'neutral';

interface EmotionSample {
  timestamp: number;
  emotion: EkmanEmotion;
  confidence: number;
  actionUnits: Record<string, number>;
}

interface EmotionAggregation {
  /** Whether emotion recognition was enabled for this stimulus */
  enabled: boolean;
  /** Total emotion samples across all participants */
  totalSamples: number;
  /** Percentage distribution per emotion (0–100) */
  distribution: Record<EkmanEmotion, number>;
  /** Most frequent emotion across all participants */
  dominantEmotion: EkmanEmotion;
  /** Average confidence across all samples */
  avgConfidence: number;
  /** Per-participant dominant emotion + sample count */
  perParticipant: Array<{
    participantId: string;
    dominantEmotion: EkmanEmotion;
    sampleCount: number;
    distribution: Record<EkmanEmotion, number>;
  }>;
  /** Downsampled timeline (1s buckets) aggregated across all participants */
  timeline: EmotionSample[];
}

interface EyeTrackingStimulus {
  moduleId: string;
  moduleName: string;
  stimulusUrl: string;
  modality: 'stand_alone' | 'shelf';
  taskDescription: string;
  totalResponses: number;
  uniqueParticipants: number;
  avgDwellTime: number;
  avgFixationCount: number;
  heatmapData: Array<{ x: number; y: number; duration: number }>;
  fixations: Array<{ x: number; y: number; duration: number; participantId: string; timestamp: number }>;
  aois: Array<{
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    dwellTimePercent: number;
    fixationCount: number;
    avgDuration: number;
    participantCount: number;
  }>;
  participants: Array<{
    participantId: string;
    calibrationQuality: string;
    calibrationRmsePx: number | null;
    integrityScore: number;
    totalFixations: number;
    totalDwellTime: number;
    qualityGrade: 'good' | 'fair' | 'low';
  }>;
  qualitySummary: {
    total: number;
    good: number;
    fair: number;
    low: number;
  };
  emotions: EmotionAggregation;
  /** TranSalNet saliency prediction data (if run). Points with x%, y%, value 0–1. */
  predictionHeatmap?: Array<{ x: number; y: number; value: number }>;
  predictionProcessedAt?: string;
  stimulusType?: 'image' | 'video';
  gazeTimeline?: Array<{ x: number; y: number; t: number; videoTime?: number; participantId: string }>;
  sequenceAnalysis?: {
    participantSequences: Array<{ participantId: string; sequence: string[] }>;
    transitionMatrix: Record<string, Record<string, number>>;
    aoiLabels: string[];
  };
}

/**
 * Extract Eye Tracking stimulus config from module config.
 * Searches for file-upload components (stimulus image) and other ET-specific fields.
 */
const extractEyeTrackingConfig = (config: any) => {
  const structure = config?.structure ?? config;
  const components: any[] = structure?.components ?? [];

  // Find stimulus image URL — canonical ID: 'stimuli', fallback to known IDs
  let stimulusUrl = '';
  const fileUploadComp = components.find((c: any) =>
    c.id === 'stimuli' || c.type === 'file-upload' || c.id === 'stimulus-image' || c.id === 'image' || c.id === 'stimulus'
  );
  if (fileUploadComp?.value) {
    try {
      const parsed = typeof fileUploadComp.value === 'string' ? JSON.parse(fileUploadComp.value) : fileUploadComp.value;
      if (Array.isArray(parsed) && parsed.length > 0) {
        stimulusUrl = parsed[0].url || parsed[0].s3Key || '';
      } else if (typeof parsed === 'string') {
        stimulusUrl = parsed;
      }
    } catch {
      // Not JSON — use raw value as URL
      stimulusUrl = fileUploadComp.value;
    }
  }

  // Modality — canonical ID: 'display-mode', fallback to legacy IDs
  let modality: 'stand_alone' | 'shelf' = 'stand_alone';
  const modalityComp = components.find((c: any) =>
    c.id === 'display-mode' || c.id === 'modality' || c.id === 'test-mode'
  );
  if (modalityComp?.value) {
    const val = String(modalityComp.value).toLowerCase();
    if (val.includes('shelf') || val === 'shelf') modality = 'shelf';
  }
  // Fallback: checkbox 'is-shelf-task' (value = "true"/"false")
  if (modality === 'stand_alone') {
    const shelfCheckbox = components.find((c: any) => c.id === 'is-shelf-task');
    if (shelfCheckbox?.value === 'true' || shelfCheckbox?.value === true) {
      modality = 'shelf';
    }
  }

  // Task description — canonical ID: 'task-instructions', fallback to legacy IDs
  let taskDescription = '';
  const descComp = components.find((c: any) =>
    c.id === 'task-instructions' || c.id === 'task-description' || c.id === 'question-title' || c.id === 'description'
  );
  if (descComp?.value) {
    taskDescription = descComp.value;
  } else if (descComp?.placeholder?.text) {
    taskDescription = descComp.placeholder.text;
  }

  // AOIs from config (researcher-defined areas of interest)
  const aoiComp = components.find((c: any) => c.id === 'aois' || c.id === 'areas-of-interest');
  let configAois: Array<{ id: string; label: string; x: number; y: number; width: number; height: number }> = [];
  if (aoiComp?.value) {
    try {
      const parsed = typeof aoiComp.value === 'string' ? JSON.parse(aoiComp.value) : aoiComp.value;
      configAois = Array.isArray(parsed) ? parsed : [];
    } catch { /* ignore */ }
  }

  // Feature toggles
  const emotionComp = components.find((c: any) => c.id === 'emotion-recognition');
  const hasEmotionRecognition = emotionComp ? String(emotionComp.value) === 'true' : true;

  return { stimulusUrl, modality, taskDescription, configAois, hasEmotionRecognition };
};

/**
 * Aggregate FACS emotion data from eye tracking responses.
 * Each response may contain `emotions: EmotionSample[]` alongside fixation data.
 */
const computeEmotionMetrics = (
  responses: any[],
  hasEmotionRecognition: boolean,
): EmotionAggregation => {
  const emptyDistribution = (): Record<EkmanEmotion, number> => ({
    joy: 0, sadness: 0, surprise: 0, anger: 0, disgust: 0, fear: 0, neutral: 0,
  });

  if (!hasEmotionRecognition) {
    return {
      enabled: false,
      totalSamples: 0,
      distribution: emptyDistribution(),
      dominantEmotion: 'neutral',
      avgConfidence: 0,
      perParticipant: [],
      timeline: [],
    };
  }

  const allSamples: EmotionSample[] = [];
  const perParticipantSamples = new Map<string, EmotionSample[]>();

  for (const row of responses) {
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      const emotions: EmotionSample[] = parsed?.emotions ?? [];
      if (emotions.length === 0) continue;

      const pid = row.participant_id;
      allSamples.push(...emotions);
      perParticipantSamples.set(pid, emotions);
    } catch { /* skip malformed */ }
  }

  if (allSamples.length === 0) {
    return {
      enabled: true,
      totalSamples: 0,
      distribution: emptyDistribution(),
      dominantEmotion: 'neutral',
      avgConfidence: 0,
      perParticipant: [],
      timeline: [],
    };
  }

  // Global distribution
  const counts = emptyDistribution();
  let totalConfidence = 0;
  for (const s of allSamples) {
    counts[s.emotion]++;
    totalConfidence += s.confidence;
  }
  const total = allSamples.length;
  const distribution = emptyDistribution();
  for (const [emotion, count] of Object.entries(counts)) {
    distribution[emotion as EkmanEmotion] = Math.round((count / total) * 10000) / 100;
  }

  const dominantEmotion = (Object.entries(counts) as [EkmanEmotion, number][])
    .reduce((best, [e, c]) => c > best[1] ? [e, c] : best, ['neutral' as EkmanEmotion, 0])[0];

  // Per-participant
  const perParticipant = Array.from(perParticipantSamples.entries()).map(([pid, samples]) => {
    const pCounts = emptyDistribution();
    for (const s of samples) pCounts[s.emotion]++;
    const pTotal = samples.length;
    const pDist = emptyDistribution();
    for (const [e, c] of Object.entries(pCounts)) {
      pDist[e as EkmanEmotion] = Math.round((c / pTotal) * 10000) / 100;
    }
    const pDominant = (Object.entries(pCounts) as [EkmanEmotion, number][])
      .reduce((best, [e, c]) => c > best[1] ? [e, c] : best, ['neutral' as EkmanEmotion, 0])[0];

    return { participantId: pid, dominantEmotion: pDominant, sampleCount: pTotal, distribution: pDist };
  });

  // Downsampled timeline (1s buckets across all participants)
  const bucketMs = 1000;
  const buckets = new Map<number, EmotionSample[]>();
  for (const s of allSamples) {
    const key = Math.floor(s.timestamp / bucketMs) * bucketMs;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }

  const timeline: EmotionSample[] = [];
  for (const [ts, bucket] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
    const bCounts: Record<string, number> = {};
    for (const s of bucket) bCounts[s.emotion] = (bCounts[s.emotion] || 0) + 1;
    const bDominant = Object.entries(bCounts).sort((a, b) => b[1] - a[1])[0][0] as EkmanEmotion;
    const bConf = bucket.reduce((sum, s) => sum + s.confidence, 0) / bucket.length;
    const avgAUs: Record<string, number> = {};
    for (const s of bucket) {
      for (const [k, v] of Object.entries(s.actionUnits)) {
        avgAUs[k] = (avgAUs[k] || 0) + v;
      }
    }
    for (const k of Object.keys(avgAUs)) avgAUs[k] /= bucket.length;

    timeline.push({ timestamp: ts, emotion: bDominant, confidence: bConf, actionUnits: avgAUs });
  }

  return {
    enabled: true,
    totalSamples: total,
    distribution,
    dominantEmotion,
    avgConfidence: totalConfidence / total,
    perParticipant,
    timeline,
  };
};

/**
 * Compute Eye Tracking analytics from gaze response data.
 * Expected response format: component_id = 'eye-tracking-data'
 * value = { fixations: [{ x, y, duration, timestamp }], calibrationQuality, integrityScore, emotions?: EmotionSample[] }
 */
/**
 * Quality gate thresholds for eye tracking data.
 * Participants below these thresholds are flagged as low quality
 * and excluded from aggregate metrics (heatmap, AOI, zones).
 */
const ET_QUALITY_THRESHOLDS = {
  /** Max acceptable calibration RMSE (px). Above = low quality. */
  maxCalibrationRmsePx: 200,
  /** Min integrity score (0-1). Below = low quality. */
  minIntegrityScore: 0.4,
  /** Min fixation count. Below = insufficient data. */
  minFixationCount: 3,
};

type QualityGrade = 'good' | 'fair' | 'low';

/** Classify participant tracking quality from calibration + data metrics. */
function classifyQuality(
  calibrationRmsePx: number | null,
  integrityScore: number,
  fixationCount: number,
): QualityGrade {
  if (fixationCount < ET_QUALITY_THRESHOLDS.minFixationCount) return 'low';
  if (integrityScore < ET_QUALITY_THRESHOLDS.minIntegrityScore) return 'low';
  if (calibrationRmsePx !== null && calibrationRmsePx > ET_QUALITY_THRESHOLDS.maxCalibrationRmsePx) return 'low';
  // Fair: borderline values
  if (calibrationRmsePx !== null && calibrationRmsePx > ET_QUALITY_THRESHOLDS.maxCalibrationRmsePx * 0.7) return 'fair';
  if (integrityScore < ET_QUALITY_THRESHOLDS.minIntegrityScore * 1.5) return 'fair';
  return 'good';
}

const computeEyeTrackingMetrics = (
  responses: any[],
  configAois: Array<{ id: string; label: string; x: number; y: number; width: number; height: number }>,
  hasEmotionRecognition: boolean,
) => {
  type Fixation = { x: number; y: number; duration: number; participantId: string; timestamp: number };
  const allFixationsRaw: Fixation[] = [];
  const participantMap = new Map<string, {
    calibrationQuality: string;
    calibrationRmsePx: number | null;
    integrityScore: number;
    totalFixations: number;
    totalDwellTime: number;
    qualityGrade: QualityGrade;
  }>();
  // Emotion samples per participant (for Emotion × AOI correlation)
  const emotionsByParticipant = new Map<string, EmotionSample[]>();

  for (const row of responses) {
    try {
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      const fixations: Array<{ x: number; y: number; duration: number; timestamp?: number }> = parsed?.fixations ?? [];
      const pid = row.participant_id;

      let totalDwell = 0;
      for (const f of fixations) {
        allFixationsRaw.push({ x: f.x, y: f.y, duration: f.duration, participantId: pid, timestamp: f.timestamp ?? 0 });
        totalDwell += f.duration;
      }

      // Collect emotion samples for AOI correlation
      const emotions: EmotionSample[] = parsed?.emotions ?? [];
      if (emotions.length > 0) {
        emotionsByParticipant.set(pid, emotions);
      }

      const rmsePx = typeof parsed?.calibrationRmsePx === 'number' ? parsed.calibrationRmsePx : null;
      const integrity = typeof parsed?.integrityScore === 'number' ? parsed.integrityScore
        : typeof parsed?.integrityScore === 'string' ? parseFloat(parsed.integrityScore) || 0
        : 0;
      const grade = classifyQuality(rmsePx, integrity, fixations.length);

      participantMap.set(pid, {
        calibrationQuality: parsed?.calibrationQuality ?? 'unknown',
        calibrationRmsePx: rmsePx,
        integrityScore: integrity,
        totalFixations: fixations.length,
        totalDwellTime: totalDwell,
        qualityGrade: grade,
      });
    } catch { /* skip malformed */ }
  }

  // Quality gate: exclude low-quality participants from aggregate metrics
  // Fallback: if excluding low-quality would leave 0 participants, keep all data
  const lowQualityPidsCandidates = new Set(
    Array.from(participantMap.entries())
      .filter(([, data]) => data.qualityGrade === 'low')
      .map(([pid]) => pid)
  );
  const wouldHaveParticipants = participantMap.size - lowQualityPidsCandidates.size > 0;
  const lowQualityPids = wouldHaveParticipants ? lowQualityPidsCandidates : new Set<string>();
  const allFixations = allFixationsRaw.filter(f => !lowQualityPids.has(f.participantId));

  // Heatmap data: aggregate fixation positions with duration as weight
  const heatmapData = allFixations.map(f => ({ x: f.x, y: f.y, duration: f.duration }));

  // Zone-based heatmap: aggregate zoneMass from quality-passing responses only
  const aggregatedZoneMass: Record<string, number> = {};
  for (const row of responses) {
    try {
      if (lowQualityPids.has(row.participant_id)) continue;
      const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      if (parsed?.zoneMass && typeof parsed.zoneMass === 'object') {
        for (const [zoneId, mass] of Object.entries(parsed.zoneMass)) {
          aggregatedZoneMass[zoneId] = (aggregatedZoneMass[zoneId] || 0) + (mass as number);
        }
      }
    } catch { /* skip */ }
  }

  // Total dwell time across all fixations
  const totalDwellTime = allFixations.reduce((sum, f) => sum + f.duration, 0);

  // Compute AOI metrics with soft Gaussian contribution (robust to webcam jitter).
  // Fixations near AOI borders contribute proportionally instead of binary in/out.
  const totalParticipants = new Set(allFixations.map(f => f.participantId)).size;

  /**
   * Soft AOI weight: Gaussian contribution based on distance to AOI center.
   * Inside AOI → ~1.0. Near border outside → 0.3-0.8. Far away → ~0.
   * σ = half of AOI's larger dimension (captures ~95% of nearby fixations).
   */
  const softAoiWeight = (fx: number, fy: number, aoi: { x: number; y: number; width: number; height: number }): number => {
    const cx = aoi.x + aoi.width / 2;
    const cy = aoi.y + aoi.height / 2;
    const dx = fx - cx;
    const dy = fy - cy;

    // Check if fully inside — weight 1.0
    if (fx >= aoi.x && fx <= aoi.x + aoi.width && fy >= aoi.y && fy <= aoi.y + aoi.height) {
      return 1.0;
    }

    // Distance to nearest edge (0 = on edge, positive = outside)
    const distX = Math.max(0, Math.abs(dx) - aoi.width / 2);
    const distY = Math.max(0, Math.abs(dy) - aoi.height / 2);
    const edgeDist = Math.sqrt(distX * distX + distY * distY);

    // σ = half of larger dimension — soft falloff outside the box
    const sigma = Math.max(aoi.width, aoi.height) * 0.35;
    if (sigma <= 0) return 0;
    return Math.exp(-(edgeDist * edgeDist) / (2 * sigma * sigma));
  };

  /** Min weight to consider a fixation as contributing to an AOI. */
  const SOFT_AOI_MIN_WEIGHT = 0.15;

  const aois = configAois.map(aoi => {
    // Compute soft weights for all fixations relative to this AOI
    const weightedFixations = allFixations
      .map(f => ({ ...f, aoiWeight: softAoiWeight(f.x, f.y, aoi) }))
      .filter(f => f.aoiWeight >= SOFT_AOI_MIN_WEIGHT);

    const aoiDwellTime = weightedFixations.reduce((sum, f) => sum + f.duration * f.aoiWeight, 0);
    // Participants who "noticed" the AOI: at least one fixation with weight >= 0.5
    const noticedParticipants = new Set(
      weightedFixations.filter(f => f.aoiWeight >= 0.5).map(f => f.participantId)
    );

    // TTFF: Time To First Fixation — use significant fixations (weight >= 0.5)
    const firstFixationByParticipant = new Map<string, number>();
    for (const f of weightedFixations) {
      if (f.aoiWeight < 0.5) continue;
      const existing = firstFixationByParticipant.get(f.participantId);
      if (existing === undefined || f.timestamp < existing) {
        firstFixationByParticipant.set(f.participantId, f.timestamp);
      }
    }
    const ttffValues = Array.from(firstFixationByParticipant.values());
    const avgTTFF = ttffValues.length > 0
      ? Math.round(ttffValues.reduce((a, b) => a + b, 0) / ttffValues.length)
      : 0;

    // Notice rate: % of total participants with significant fixation in AOI
    const noticeRate = totalParticipants > 0
      ? Math.round((noticedParticipants.size / totalParticipants) * 100)
      : 0;

    // Effective fixation count: sum of weights (fractional fixations)
    const effectiveFixationCount = Math.round(
      weightedFixations.reduce((sum, f) => sum + f.aoiWeight, 0)
    );

    // Emotion × AOI: find dominant emotion while looking at this AOI
    // Use weighted fixations (weight >= 0.5) for emotion matching
    const aoiEmotionCounts: Record<EkmanEmotion, number> = {
      joy: 0, sadness: 0, surprise: 0, anger: 0, disgust: 0, fear: 0, neutral: 0,
    };
    let aoiEmotionTotal = 0;
    for (const pid of noticedParticipants) {
      const pEmotions = emotionsByParticipant.get(pid);
      if (!pEmotions || pEmotions.length === 0) continue;
      const pFixationsInAOI = weightedFixations.filter(f => f.participantId === pid && f.aoiWeight >= 0.5);
      for (const fix of pFixationsInAOI) {
        const fixStart = fix.timestamp;
        const fixEnd = fix.timestamp + fix.duration;
        for (const em of pEmotions) {
          if (em.timestamp >= fixStart - 100 && em.timestamp <= fixEnd + 100) {
            aoiEmotionCounts[em.emotion]++;
            aoiEmotionTotal++;
          }
        }
      }
    }

    let aoiDominantEmotion: EkmanEmotion | undefined;
    const aoiEmotionDistribution: Record<EkmanEmotion, number> | undefined = aoiEmotionTotal > 0
      ? (() => {
          const dist = {} as Record<EkmanEmotion, number>;
          let bestEmotion: EkmanEmotion = 'neutral';
          let bestCount = 0;
          for (const [emotion, count] of Object.entries(aoiEmotionCounts) as [EkmanEmotion, number][]) {
            dist[emotion] = Math.round((count / aoiEmotionTotal) * 10000) / 100;
            if (count > bestCount) { bestCount = count; bestEmotion = emotion; }
          }
          aoiDominantEmotion = bestEmotion;
          return dist;
        })()
      : undefined;

    return {
      ...aoi,
      dwellTimePercent: totalDwellTime > 0 ? Math.round((aoiDwellTime / totalDwellTime) * 100) : 0,
      fixationCount: effectiveFixationCount,
      avgDuration: effectiveFixationCount > 0
        ? Math.round(aoiDwellTime / effectiveFixationCount)
        : 0,
      participantCount: noticedParticipants.size,
      avgTTFF,
      noticeRate,
      /** Dominant emotion while looking at this AOI */
      dominantEmotion: aoiDominantEmotion,
      /** Emotion distribution while looking at this AOI */
      emotionDistribution: aoiEmotionDistribution,
    };
  });

  const uniqueParticipants = new Set(allFixations.map(f => f.participantId));
  const avgDwellTime = uniqueParticipants.size > 0
    ? Math.round(totalDwellTime / uniqueParticipants.size)
    : 0;
  const avgFixationCount = uniqueParticipants.size > 0
    ? Math.round(allFixations.length / uniqueParticipants.size)
    : 0;

  const participants = Array.from(participantMap.entries()).map(([pid, data]) => ({
    participantId: pid,
    ...data,
  }));

  const qualitySummary = {
    total: participantMap.size,
    good: Array.from(participantMap.values()).filter(p => p.qualityGrade === 'good').length,
    fair: Array.from(participantMap.values()).filter(p => p.qualityGrade === 'fair').length,
    low: lowQualityPids.size,
  };

  const emotions = computeEmotionMetrics(responses, hasEmotionRecognition);

  // Sequence analysis: AOI visit order per participant + transition matrix
  let sequenceAnalysis: {
    participantSequences: Array<{ participantId: string; sequence: string[] }>;
    transitionMatrix: Record<string, Record<string, number>>;
    aoiLabels: string[];
  } | undefined;

  if (configAois.length >= 2 && allFixations.length > 0) {
    const aoiLabels = configAois.map(a => a.label || a.id);
    const aoiLookup = configAois.map(a => ({
      id: a.id, label: a.label || a.id,
      x: a.x, y: a.y, w: a.width, h: a.height,
    }));

    const findAOI = (fx: number, fy: number): string | null => {
      for (const a of aoiLookup) {
        if (fx >= a.x && fx <= a.x + a.w && fy >= a.y && fy <= a.y + a.h) return a.label;
      }
      return null;
    };

    // Build per-participant AOI visit sequences (deduplicate consecutive same-AOI)
    const byParticipant = new Map<string, Array<{ aoi: string; timestamp: number }>>();
    for (const f of allFixations) {
      const aoiLabel = findAOI(f.x, f.y);
      if (!aoiLabel) continue;
      if (!byParticipant.has(f.participantId)) byParticipant.set(f.participantId, []);
      byParticipant.get(f.participantId)!.push({ aoi: aoiLabel, timestamp: f.timestamp });
    }

    const participantSequences: Array<{ participantId: string; sequence: string[] }> = [];
    const transitionCounts: Record<string, Record<string, number>> = {};
    // Initialize matrix
    for (const label of aoiLabels) {
      transitionCounts[label] = {};
      for (const label2 of aoiLabels) transitionCounts[label][label2] = 0;
    }

    for (const [pid, visits] of byParticipant) {
      // Sort by timestamp, deduplicate consecutive
      visits.sort((a, b) => a.timestamp - b.timestamp);
      const seq: string[] = [];
      for (const v of visits) {
        if (seq.length === 0 || seq[seq.length - 1] !== v.aoi) seq.push(v.aoi);
      }
      participantSequences.push({ participantId: pid, sequence: seq });

      // Count transitions
      for (let i = 0; i < seq.length - 1; i++) {
        const from = seq[i];
        const to = seq[i + 1];
        if (transitionCounts[from] && transitionCounts[from][to] !== undefined) {
          transitionCounts[from][to]++;
        }
      }
    }

    // Normalize transitions to probabilities (row-sum = 100%)
    const transitionMatrix: Record<string, Record<string, number>> = {};
    for (const from of aoiLabels) {
      const rowSum = Object.values(transitionCounts[from]).reduce((a, b) => a + b, 0);
      transitionMatrix[from] = {};
      for (const to of aoiLabels) {
        transitionMatrix[from][to] = rowSum > 0
          ? Math.round((transitionCounts[from][to] / rowSum) * 100)
          : 0;
      }
    }

    sequenceAnalysis = { participantSequences, transitionMatrix, aoiLabels };
  }

  return {
    uniqueParticipants: uniqueParticipants.size,
    avgDwellTime,
    avgFixationCount,
    heatmapData,
    zoneMass: aggregatedZoneMass,
    fixations: allFixations,
    aois,
    participants,
    qualitySummary,
    emotions,
    sequenceAnalysis,
  };
};

export const getEyeTrackingResults = async (researchId: string) => {
  // 1. Find the Eye Tracking stage
  const stageQuery = `
    SELECT s.id as stage_id, s.name as stage_name
    FROM stages s
    WHERE s.research_id = ?
      AND LOWER(s.name) = 'eye tracking'
    LIMIT 1
  `;
  const stageResult = await pool.query(stageQuery, [researchId]);
  if (stageResult.rows.length === 0) {
    return { stimuli: [] };
  }
  const stageId = stageResult.rows[0].stage_id;

  // 2. Get modules in this stage
  const moduleQuery = `
    SELECT id, name, config FROM modules
    WHERE research_id = ? AND stage_id = ?
    ORDER BY order_index
  `;
  const moduleResult = await pool.query(moduleQuery, [researchId, stageId]);

  const stimuli: EyeTrackingStimulus[] = [];

  for (const mod of moduleResult.rows) {
    let config: any = {};
    try {
      config = typeof mod.config === 'string' ? JSON.parse(mod.config) : mod.config;
    } catch { /* ignore */ }

    const { stimulusUrl, modality, taskDescription, configAois, hasEmotionRecognition } = extractEyeTrackingConfig(config);

    // 3. Get responses for this module (component_id = 'eye-tracking-data')
    const responsesQuery = `
      SELECT r.value, r.participant_id, r.created_at
      FROM responses r
      WHERE r.research_id = ? AND r.module_id = ? AND r.component_id = 'eye-tracking-data'
      ORDER BY r.created_at ASC
    `;
    const responsesResult = await pool.query(responsesQuery, [researchId, mod.id]);

    const metrics = computeEyeTrackingMetrics(responsesResult.rows, configAois, hasEmotionRecognition);

    // TranSalNet prediction data (stored in module config by attention-prediction controller)
    const predictionHeatmap = config.predictionHeatmap as Array<{ x: number; y: number; value: number }> | undefined;
    const predictionProcessedAt = config.predictionProcessedAt as string | undefined;

    // Extract stimulus type and gaze timeline from responses (for video stimuli)
    let stimulusType: 'image' | 'video' = 'image';
    const gazeTimeline: Array<{ x: number; y: number; t: number; videoTime?: number; participantId: string }> = [];
    for (const row of responsesResult.rows) {
      try {
        const parsed = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (parsed?.stimulusType === 'video') stimulusType = 'video';
        if (parsed?.gazeTimeline && Array.isArray(parsed.gazeTimeline)) {
          for (const pt of parsed.gazeTimeline) {
            gazeTimeline.push({ ...pt, participantId: row.participant_id });
          }
        }
      } catch { /* skip */ }
    }

    stimuli.push({
      moduleId: mod.id,
      moduleName: mod.name,
      stimulusUrl,
      modality,
      taskDescription,
      totalResponses: responsesResult.rows.length,
      ...metrics,
      predictionHeatmap: predictionHeatmap?.length ? predictionHeatmap : undefined,
      predictionProcessedAt,
      stimulusType,
      gazeTimeline: gazeTimeline.length > 0 ? gazeTimeline : undefined,
    });
  }

  return { stimuli };
};

// ==========================================
// CLIENT'S BENCHMARK RESULTS
// ==========================================

interface BenchmarkAOI {
  id: string;
  label: string;
  dwellTimePercent: number;
  fixationCount: number;
  avgDuration: number;
  participantCount: number;
}

interface BenchmarkResearchResult {
  researchId: string;
  researchName: string;
  modules: Array<{
    moduleId: string;
    moduleName: string;
    stimulusUrl: string;
    uniqueParticipants: number;
    totalResponses: number;
    aois: BenchmarkAOI[];
  }>;
}

/**
 * Get benchmark comparison data for a Client's Benchmark research.
 * Reads selected research IDs from config.stimuli, fetches Eye Tracking
 * AOI metrics (% Attention + fixation count) from each.
 */
export const getBenchmarkResults = async (researchId: string) => {
  // 1. Get the benchmark research config to find selected research IDs
  const configQuery = `SELECT config FROM researches WHERE id = ?`;
  const configResult = await pool.query(configQuery, [researchId]);
  if (configResult.rows.length === 0) {
    throw new Error('Benchmark research not found');
  }

  let config: any = {};
  try {
    config = typeof configResult.rows[0].config === 'string'
      ? JSON.parse(configResult.rows[0].config)
      : configResult.rows[0].config;
  } catch { /* ignore */ }

  const stimuli: Array<{ researchId: string }> = config?.stimuli || [];
  const selectedResearchIds = stimuli.map(s => s.researchId).filter(Boolean);

  if (selectedResearchIds.length === 0) {
    return { researches: [] };
  }

  const researches: BenchmarkResearchResult[] = [];

  for (const targetResearchId of selectedResearchIds) {
    // Get research name
    const nameQuery = `SELECT name FROM researches WHERE id = ?`;
    const nameResult = await pool.query(nameQuery, [targetResearchId]);
    const researchName = nameResult.rows[0]?.name || 'Unknown Research';

    // Find Eye Tracking stage
    const stageQuery = `
      SELECT s.id as stage_id
      FROM stages s
      WHERE s.research_id = ? AND LOWER(s.name) = 'eye tracking'
      LIMIT 1
    `;
    const stageResult = await pool.query(stageQuery, [targetResearchId]);
    if (stageResult.rows.length === 0) {
      researches.push({ researchId: targetResearchId, researchName, modules: [] });
      continue;
    }
    const stageId = stageResult.rows[0].stage_id;

    // Get modules in the Eye Tracking stage
    const moduleQuery = `
      SELECT id, name, config FROM modules
      WHERE research_id = ? AND stage_id = ?
      ORDER BY order_index
    `;
    const moduleResult = await pool.query(moduleQuery, [targetResearchId, stageId]);

    const modules: BenchmarkResearchResult['modules'] = [];

    for (const mod of moduleResult.rows) {
      let modConfig: any = {};
      try {
        modConfig = typeof mod.config === 'string' ? JSON.parse(mod.config) : mod.config;
      } catch { /* ignore */ }

      const { stimulusUrl, configAois } = extractEyeTrackingConfig(modConfig);

      // Get responses
      const responsesQuery = `
        SELECT r.value, r.participant_id
        FROM responses r
        WHERE r.research_id = ? AND r.module_id = ? AND r.component_id = 'eye-tracking-data'
        ORDER BY r.created_at ASC
      `;
      const responsesResult = await pool.query(responsesQuery, [targetResearchId, mod.id]);

      const metrics = computeEyeTrackingMetrics(responsesResult.rows, configAois, false);

      modules.push({
        moduleId: mod.id,
        moduleName: mod.name,
        stimulusUrl,
        uniqueParticipants: metrics.uniqueParticipants,
        totalResponses: responsesResult.rows.length,
        aois: metrics.aois.map(aoi => ({
          id: aoi.id,
          label: aoi.label,
          dwellTimePercent: aoi.dwellTimePercent,
          fixationCount: aoi.fixationCount,
          avgDuration: aoi.avgDuration,
          participantCount: aoi.participantCount,
        })),
      });
    }

    researches.push({ researchId: targetResearchId, researchName, modules });
  }

  return { researches };
};
