import pool from '../../config/database';

/**
 * Analytics Service
 * Aggregates and analyzes participant responses for research results
 */

// ==========================================
// COGNITIVE TASK RESULTS
// ==========================================

export const getCognitiveTaskResults = async (researchId: string) => {
  // Get all modules for this research
  const modulesQuery = `
    SELECT id, name, description
    FROM modules
    WHERE research_id = ?
    ORDER BY order_index
  `;
  const modulesResult = await pool.query(modulesQuery, [researchId]);
  
  const modules = await Promise.all(modulesResult.rows.map(async (module) => {
    const responses = await getModuleResponses(researchId, module.id);
    return {
      moduleId: module.id,
      moduleName: module.name,
      description: module.description,
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
  const query = `
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
  `;

  const result = await pool.query(query, [researchId, moduleId]);

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

  return {
    totalResponses: responses.length,
    choiceCounts: Object.entries(choiceCounts).map(([choice, count]) => ({
      choice,
      count,
      percentage: responses.length > 0 ? (count / responses.length) * 100 : 0,
    })),
    responses,
  };
};

// ==========================================
// SCALE RESPONSES (Linear Scale)
// ==========================================

export const getScaleResponses = async (researchId: string, moduleId: string) => {
  const query = `
    SELECT 
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id
    FROM responses r
    WHERE r.research_id = ? 
      AND r.module_id = ?
      AND r.component_id = 'scale'
    ORDER BY r.created_at ASC
  `;

  const result = await pool.query(query, [researchId, moduleId]);

  const responses = result.rows.map(row => ({
    participantId: row.participant_id,
    value: typeof row.value === 'number' ? row.value : parseInt(row.value as string),
    metadata: row.metadata,
    createdAt: row.created_at,
  }));

  // Aggregate scale distribution
  const distribution: Record<number, number> = {};
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
  const query = `
    SELECT 
      r.value,
      r.metadata,
      r.created_at,
      r.participant_id
    FROM responses r
    WHERE r.research_id = ? 
      AND r.module_id = ?
      AND r.component_id = 'ranking'
    ORDER BY r.created_at ASC
  `;

  const result = await pool.query(query, [researchId, moduleId]);

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

  const rankings = Object.entries(positionSums).map(([item, data]) => ({
    item,
    meanPosition: data.count > 0 ? data.sum / data.count : 0,
    count: data.count,
  })).sort((a, b) => a.meanPosition - b.meanPosition);

  return {
    totalResponses: responses.length,
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

  // Process responses by type
  const csatScores: number[] = [];
  const cesScores: number[] = [];
  const npsScores: number[] = [];
  const cvScores: number[] = [];
  const nevScores: number[] = [];
  const vocResponses: Array<{ text: string; sentiment?: string; participantId: string; createdAt: string }> = [];
  const emotionalStates: Record<string, number> = {};

  responsesResult.rows.forEach((row) => {
    const moduleName = row.module_name.toLowerCase();
    const value = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);

    try {
      // CSAT (scale 1-5)
      if (moduleName.includes('csat')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          csatScores.push(score);
        }
      }
      // CES (scale 1-5)
      else if (moduleName.includes('ces')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          cesScores.push(score);
        }
      }
      // NPS (scale 0-10)
      else if (moduleName.includes('nps')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 0 && score <= 10) {
          npsScores.push(score);
        }
      }
      // CV (scale 1-5)
      else if (moduleName.includes('cv')) {
        const score = parseInt(value);
        if (!isNaN(score) && score >= 1 && score <= 5) {
          cvScores.push(score);
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

        // Count emotional states
        emotions.forEach((emotion: string) => {
          emotionalStates[emotion] = (emotionalStates[emotion] || 0) + 1;
        });

        // Calculate NEV score
        const positiveCount = emotions.filter((e: string) => POSITIVE_EMOTIONS.includes(e)).length;
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

  // Calculate metrics
  const totalResponses = responsesResult.rows.length;
  const uniqueParticipants = new Set(responsesResult.rows.map(r => r.participant_id)).size;

  // NPS calculation
  const promoters = npsScores.filter(s => s >= 9).length;
  const passives = npsScores.filter(s => s >= 7 && s <= 8).length;
  const detractors = npsScores.filter(s => s <= 6).length;
  const npsScore = npsScores.length > 0 
    ? Math.round(((promoters - detractors) / npsScores.length) * 100)
    : 0;

  // CSAT & CES percentages
  const csatPercentage = csatScores.length > 0
    ? Math.round((csatScores.filter(s => s >= 4).length / csatScores.length) * 100)
    : 0;
  const cesPercentage = cesScores.length > 0
    ? Math.round((cesScores.filter(s => s <= 2).length / cesScores.length) * 100)
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
      retention: Math.round(((promoters + passives) / Math.max(npsScores.length, 1)) * 100),
      npsScore,
      promoters,
      neutrals: passives,
      detractors,
      csatScores,
      cesScores,
      cvScores,
      impact: promoters > detractors ? 'High' : totalResponses > 0 ? 'Medium' : 'Low',
      trend: promoters > detractors ? 'Increasing' : totalResponses > 0 ? 'Stable' : 'Decreasing'
    },
    timeSeriesData,
    intradayTimeSeriesData,
    vocResponses,
    monthlyNPSData,
    monthlyMetricsData,
    emotionalStates
  };
};

// Positive emotions list for NEV calculation (shared between aggregation and time series)
const POSITIVE_EMOTIONS = [
  'Feliz', 'Satisfecho', 'Confiado', 'Valorado', 'Cuidado', 'Seguro',
  'Enfocado', 'Indulgente', 'Estimulado', 'Exploratorio', 'Interesado', 'Enérgico'
];

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
      const positive = emotions.filter((e: string) => POSITIVE_EMOTIONS.includes(e)).length;
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
