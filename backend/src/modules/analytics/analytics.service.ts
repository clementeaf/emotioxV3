import pool from '../../config/database';

/**
 * Analytics Service
 * Aggregates and analyzes participant responses for research results
 */

// ==========================================
// COGNITIVE TASK RESULTS
// ==========================================

export const getCognitiveTaskResults = async (researchId: string) => {
  // Get all modules for this research (include config to extract question text)
  const modulesQuery = `
    SELECT id, name, description, config
    FROM modules
    WHERE research_id = ?
    ORDER BY order_index
  `;
  const modulesResult = await pool.query(modulesQuery, [researchId]);

  const modules = await Promise.all(modulesResult.rows.map(async (module) => {
    const responses = await getModuleResponses(researchId, module.id);

    // Extract question text from module config
    let questionText = '';
    try {
      const config = typeof module.config === 'string' ? JSON.parse(module.config) : module.config;
      const structure = config?.structure ?? config;
      const titleComponent = structure?.components?.find((c: { id: string }) => c.id === 'question-title');
      questionText = titleComponent?.value || '';
    } catch { /* ignore */ }

    return {
      moduleId: module.id,
      moduleName: module.name,
      description: module.description,
      questionText,
      totalResponses: responses.length,
      responses,
    };
  }));

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

  // Heatmap data (aggregate all click coordinates)
  const allClicks = responses.flatMap((r: any) => r.clickSequence || []);

  return {
    totalResponses,
    completedFlows,
    completionRate: totalResponses > 0 ? (completedFlows / totalResponses) * 100 : 0,
    totalClicks,
    correctClicks,
    accuracy: totalClicks > 0 ? (correctClicks / totalClicks) * 100 : 0,
    averageDuration: Math.round(averageDuration / 1000), // Convert to seconds
    heatmapData: allClicks,
    responses,
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

  const responses = result.rows.map(row => ({
    participantId: row.participant_id,
    text: typeof row.value === 'string' ? row.value : JSON.stringify(row.value),
    metadata: row.metadata,
    createdAt: row.created_at,
  }));

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
      const startComponent = structure?.components?.find((c: { id: string }) => c.id === 'scale-start-value');
      const endComponent = structure?.components?.find((c: { id: string }) => c.id === 'scale-end-value');
      if (startComponent?.value) scaleStart = parseInt(startComponent.value) || 1;
      if (endComponent?.value) scaleEnd = parseInt(endComponent.value) || 5;
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
// HELPER FUNCTIONS
// ==========================================

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
  return result.rows;
};

// ==========================================
// SMARTVOC RESULTS
// ==========================================

export const getSmartVOCResults = async (researchId: string) => {
  // Note: module discovery is done implicitly via the responses query below

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

  responsesResult.rows.forEach((row) => {
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
      // CES (scale 1-5)
      else if (moduleName.includes('ces')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
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
        vocResponses.push({
          text: value,
          participantId: row.participant_id,
          createdAt: row.created_at
        });
      }
    } catch (error) {
      console.error('Error processing SmartVOC response:', error);
    }
  });

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
    nevResponsesData
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
    const dayCESScores = extractScores(dayResponses, 'ces', 1, 5);
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
    const cesScores = extractScores(slotResponses, 'ces', 1, 5);
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
    const cesScores = extractScores(monthResponses, 'ces', 1, 5);
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
