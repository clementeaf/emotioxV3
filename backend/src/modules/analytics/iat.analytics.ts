import pool from '../../config/database';

/**
 * Implicit Association Test (IAT) Analytics
 * Aggregates and analyzes IAT responses including D-score computation
 */

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
  /** Split-half reliability (Spearman-Brown corrected), null if < 10 trials */
  reliability: number | null;
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

    // Objects Comparing: criteria-1/criteria-2 are the two dimensions (e.g. Bueno/Malo).
    // The ranking list items are individual criteria, not chart dimensions.
    // Always override attributes with criteria-1/criteria-2 for Objects Comparing.
    if (testType === 'objects_comparing') {
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
      // Include all block trials (block-1, block-2, block-3, test), exclude practice/exercise
      for (const t of trials) {
        if (t.rt > 0 && (t.phase?.startsWith('block') || t.phase === 'test')) {
          allTrials.push(t);
        }
      }
    } catch { /* skip malformed */ }
  }

  // Group trials by (criterionId, targetId) → array of reaction times
  // Trial targetId may be compound: "object-1__criterion-UUID" → extract base "object-1"
  const rtMap: Record<string, Record<string, number[]>> = {};
  for (const t of allTrials) {
    const baseTargetId = t.targetId.includes('__') ? t.targetId.split('__')[0] : t.targetId;
    if (!rtMap[t.criterionId]) rtMap[t.criterionId] = {};
    if (!rtMap[t.criterionId][baseTargetId]) rtMap[t.criterionId][baseTargetId] = [];
    rtMap[t.criterionId][baseTargetId].push(t.rt);
  }

  // Compute overall mean RT and SD for normalization
  const allRTs = allTrials.map(t => t.rt);
  const overallMean = allRTs.length > 0 ? allRTs.reduce((a, b) => a + b, 0) / allRTs.length : 0;
  const overallSD = allRTs.length > 1
    ? Math.sqrt(allRTs.reduce((sum, rt) => sum + (rt - overallMean) ** 2, 0) / (allRTs.length - 1))
    : 1;

  // For Objects Comparing: trials use combined-left/combined-right as criterionId, not criteria-1/criteria-2.
  // Group target trials by block to derive dimension association from RT differences.
  if (testType === 'objects_comparing' && attributes.length === 2) {
    // Collect mean RT per target per block (only trials where targetId starts with "target-")
    const targetBlockRTs: Record<string, Record<string, number[]>> = {};
    for (const t of allTrials) {
      if (!t.targetId.startsWith('target-')) continue;
      if (!targetBlockRTs[t.targetId]) targetBlockRTs[t.targetId] = {};
      if (!targetBlockRTs[t.targetId][t.phase]) targetBlockRTs[t.targetId][t.phase] = [];
      targetBlockRTs[t.targetId][t.phase].push(t.rt);
    }

    // For each target, compute mean RT in block-2 vs block-3.
    // Faster in block-2 → stronger association with the dimension on that side.
    // We score as: dim1 strength = normalized(block-3 mean - block-2 mean), dim2 = inverse.
    const dim1Scores: Record<string, number> = {};
    const dim2Scores: Record<string, number> = {};

    for (const target of targets) {
      const b2rts = targetBlockRTs[target.id]?.['block-2'] ?? [];
      const b3rts = targetBlockRTs[target.id]?.['block-3'] ?? [];
      if (b2rts.length === 0 && b3rts.length === 0) {
        dim1Scores[target.id] = 0;
        dim2Scores[target.id] = 0;
        continue;
      }
      const meanB2 = b2rts.length > 0 ? b2rts.reduce((a, b) => a + b, 0) / b2rts.length : overallMean;
      const meanB3 = b3rts.length > 0 ? b3rts.reduce((a, b) => a + b, 0) / b3rts.length : overallMean;
      // Positive D = faster in block-2 (associated with dim1), negative = faster in block-3 (dim2)
      const d = overallSD > 0 ? (meanB3 - meanB2) / overallSD : 0;
      const score = Math.max(-100, Math.min(100, Math.round(d * 50)));
      dim1Scores[target.id] = Math.max(0, score);
      dim2Scores[target.id] = Math.max(0, -score);
    }

    return [
      { attributeId: attributes[0].id, attributeLabel: attributes[0].label, targetScores: dim1Scores },
      { attributeId: attributes[1].id, attributeLabel: attributes[1].label, targetScores: dim2Scores },
    ];
  }

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
  // Step 1: Remove trials > 10,000ms and < 300ms (Greenwald 2003 improved algorithm)
  const filteredCompat = compatibleRTs.filter(rt => rt >= 300 && rt <= 10000);
  const filteredIncompat = incompatibleRTs.filter(rt => rt >= 300 && rt <= 10000);

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
 * Compute split-half reliability using odd/even trial split + Spearman-Brown correction.
 * Returns null if fewer than 10 D-scores (insufficient for reliability estimate).
 */
function computeSplitHalfReliability(individualDScores: number[]): number | null {
  const valid = individualDScores.filter(d => Number.isFinite(d));
  if (valid.length < 10) return null;

  // Split into odd/even halves
  const odd = valid.filter((_, i) => i % 2 === 0);
  const even = valid.filter((_, i) => i % 2 === 1);

  if (odd.length < 2 || even.length < 2) return null;

  // Pearson correlation between halves
  const n = Math.min(odd.length, even.length);
  const meanOdd = odd.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const meanEven = even.slice(0, n).reduce((a, b) => a + b, 0) / n;

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = odd[i] - meanOdd;
    const dy = even[i] - meanEven;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return null;

  const r = sumXY / denom;

  // Spearman-Brown correction: reliability = 2r / (1 + r)
  const reliability = (2 * r) / (1 + Math.abs(r));
  return Math.round(Math.max(0, Math.min(1, reliability)) * 1000) / 1000;
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
        reliability: null,
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
    reliability: computeSplitHalfReliability(valid),
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

  // 2. Get modules in this stage — only IAT modules (Attribute Testing, Comparing Attribute, Objects Comparing)
  const moduleQuery = `
    SELECT id, name, config FROM modules
    WHERE research_id = ? AND stage_id = ?
      AND (LOWER(name) LIKE '%attribute%' OR LOWER(name) LIKE '%objects comparing%' OR LOWER(name) LIKE '%object comparing%')
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
