import pool from '../../config/database';

/**
 * SmartVOC Analytics
 * Aggregates and analyzes SmartVOC (NPS, CSAT, CES, CV, NEV, VOC) responses
 */

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
    ? Math.round((cesValues.filter(s => s >= 4).length / cesValues.length) * 100)
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
 * Calculate CES percentage from scores: (high scores = easy) / total * 100
 * CES asks "How easy was it?" — high scores are positive.
 */
const calculateCESPercentage = (scores: number[]): number => {
  if (scores.length === 0) return 0;
  return Math.round((scores.filter(s => s >= 4).length / scores.length) * 100);
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
      ? Math.round((cesScores.filter(s => s >= 4).length / cesScores.length) * 100) : 0;
    const cesNegative = cesScores.length > 0
      ? Math.round((cesScores.filter(s => s <= 2).length / cesScores.length) * 100) : 0;

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
