import pool from '../../config/database';
import type { PoolClient } from '../../config/database';

/**
 * Demographic Quota Service
 * Handles quota tracking, validation, and enforcement for research demographic screening
 */

interface QuotaConfig {
    id: string;
    value: string; // e.g., '18-25', 'Male', 'Chile'
    limit: number;
    enabled: boolean;
    enforcementMode?: 'immediate' | 'post_collection';
    quotaType?: 'percentage';
}

type LocationGranularity = 'countryOnly' | 'countryCity';

interface DemographicConfig {
    enabled: boolean;
    quotas?: QuotaConfig[];
    disqualifications?: Array<{ id: string; value: string; enabled: boolean }>;
    min?: number;
    max?: number;
    value?: string; // For country/geographic restrictions
    granularity?: LocationGranularity;
}

interface ValidationResult {
    valid: boolean;
    reason?: 'DISQUALIFIED' | 'QUOTA_FULL';
    details?: string;
}

/**
 * Syncs quota records in database from research configuration
 * Creates missing quotas, updates existing ones, disables obsolete ones
 */
export async function syncQuotasFromConfig(
    researchId: string,
    demographics: Record<string, DemographicConfig>
): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get existing quotas for this research
        const existingQuotas = await client.query(
            `SELECT id, demographic_type, quota_value 
             FROM demographic_quotas 
             WHERE research_id = ?`,
            [researchId]
        );

        const existingMap = new Map(
            existingQuotas.rows.map(row => [
                `${row.demographic_type}:${row.quota_value}`,
                row.id
            ])
        );

        const configuredQuotas = new Set<string>();

        // Process each demographic type
        for (const [demographicType, config] of Object.entries(demographics)) {
            if (!config.enabled || !config.quotas) continue;

            for (const quota of config.quotas) {
                if (!quota.enabled) continue;

                const key = `${demographicType}:${quota.value}`;
                configuredQuotas.add(key);

                const enforcementMode = 'immediate';
                const quotaType = 'percentage';

                if (existingMap.has(key)) {
                    // Update existing quota
                    await client.query(
                        `UPDATE demographic_quotas
                         SET quota_limit = ?, enabled = true, enforcement_mode = ?, quota_type = ?, updated_at = NOW()
                         WHERE id = ?`,
                        [quota.limit, enforcementMode, quotaType, existingMap.get(key)]
                    );
                } else {
                    // Insert new quota
                    await client.query(
                        `INSERT INTO demographic_quotas
                         (research_id, demographic_type, quota_value, quota_limit, quota_type, enabled, enforcement_mode)
                         VALUES (?, ?, ?, ?, ?, true, ?)`,
                        [researchId, demographicType, quota.value, quota.limit, quotaType, enforcementMode]
                    );
                }
            }
        }

        // Disable quotas that are no longer in config
        for (const [key, id] of existingMap.entries()) {
            if (!configuredQuotas.has(key)) {
                await client.query(
                    'UPDATE demographic_quotas SET enabled = false WHERE id = ?',
                    [id]
                );
            }
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Checks if a demographic answer matches a quota value
 * Handles range-based (age, income) and exact value matching
 */
function matchesQuotaValue(answer: string, quotaValue: string, demographicType: string): boolean {
    // Range-based demographics (age, annualIncome, dailyHoursOnline)
    if (['age', 'annualIncome', 'dailyHoursOnline'].includes(demographicType)) {
        const numValue = parseInt(answer);
        // If answer is not numeric (e.g., "Menor 18"), fall back to exact string match
        if (isNaN(numValue)) return answer === quotaValue;

        if (quotaValue.includes('-')) {
            // Range: e.g., '18-25'
            const [min, max] = quotaValue.split('-').map(v => parseInt(v.trim()));
            return numValue >= min && numValue <= max;
        } else if (quotaValue.startsWith('>')) {
            const threshold = parseInt(quotaValue.substring(1));
            return numValue > threshold;
        } else if (quotaValue.startsWith('<')) {
            const threshold = parseInt(quotaValue.substring(1));
            return numValue < threshold;
        } else {
            const exactValue = parseInt(quotaValue);
            return numValue === exactValue;
        }
    }

    // Exact match for categorical demographics
    return answer === quotaValue;
}

/**
 * Checks if participant passes disqualification rules
 */
function checkDisqualifications(
    answers: Record<string, string>,
    demographics: Record<string, DemographicConfig>
): { disqualified: boolean; reason?: string } {
    for (const [type, config] of Object.entries(demographics)) {
        if (!config.enabled || !answers[type]) continue;

        const answer = answers[type];

        // Check range-based criteria
        if (['age', 'annualIncome', 'dailyHoursOnline'].includes(type)) {
            const numValue = parseInt(answer);
            if (!isNaN(numValue)) {
                if (config.min && numValue < config.min) {
                    return { disqualified: true, reason: `${type} below minimum` };
                }
                if (config.max && numValue > config.max) {
                    return { disqualified: true, reason: `${type} above maximum` };
                }
            }
        }

        // Check disqualification list
        if (config.disqualifications) {
            for (const disq of config.disqualifications) {
                if (!disq.enabled) continue;

                if (matchesQuotaValue(answer, disq.value, type)) {
                    return { disqualified: true, reason: `${type} = ${disq.value}` };
                }
            }
        }

        // Check geographic restrictions
        if (type === 'country') {
            if (config.value && config.value !== 'All' && answer !== config.value) {
                return { disqualified: true, reason: 'Country not allowed' };
            }
        }
    }

    return { disqualified: false };
}

/**
 * Resolves the effective absolute limit for a quota row.
 * quota_type = 'percentage' → ceil(quota_limit * participantLimit / 100)
 * Falls back to quota_limit if participantLimit is not available.
 */
function resolveAbsoluteLimit(quotaLimit: number, quotaType: string, participantLimit: number | null): number {
    if (quotaType === 'percentage' && participantLimit && participantLimit > 0) {
        return Math.ceil((quotaLimit * participantLimit) / 100);
    }
    // Fallback: treat quota_limit as absolute count
    return quotaLimit;
}

/**
 * Atomically validates demographics and increments quota counters in a single transaction.
 * Uses UPDATE ... WHERE current_count < resolved_limit to prevent race conditions.
 * participantLimit is used to convert percentage quotas to absolute counts.
 * Must be called within an existing transaction (caller manages BEGIN/COMMIT/ROLLBACK).
 */
export async function tryIncrementQuota(
    client: PoolClient,
    researchId: string,
    participantId: string,
    demographicAnswers: Record<string, string>,
    demographicConfig: Record<string, DemographicConfig>,
    participantLimit?: number | null
): Promise<ValidationResult> {
    // 1. Check disqualifications (pure JS, no DB)
    const disqualCheck = checkDisqualifications(demographicAnswers, demographicConfig);
    if (disqualCheck.disqualified) {
        return {
            valid: false,
            reason: 'DISQUALIFIED',
            details: disqualCheck.reason
        };
    }

    // 2. Save participant demographics
    for (const [type, value] of Object.entries(demographicAnswers)) {
        await client.query(
            `INSERT INTO participant_demographics
             (research_id, participant_id, demographic_type, demographic_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE demographic_value = VALUES(demographic_value)`,
            [researchId, participantId, type, value]
        );
    }

    // 3. Get all enabled quotas for this research (with row lock)
    const quotas = await client.query(
        `SELECT id, demographic_type, quota_value, quota_limit, quota_type, current_count, enforcement_mode
         FROM demographic_quotas
         WHERE research_id = ? AND enabled = true
         FOR UPDATE`,
        [researchId]
    );

    // 4. For each matching quota, atomically increment (all quotas are immediate now)
    const incrementedIds: string[] = [];

    for (const quota of quotas.rows) {
        const answer = demographicAnswers[quota.demographic_type];
        if (!answer) continue;

        if (matchesQuotaValue(answer, quota.quota_value, quota.demographic_type)) {
            const absoluteLimit = resolveAbsoluteLimit(
                quota.quota_limit,
                quota.quota_type || 'percentage',
                participantLimit ?? null
            );

            // Check if current_count already reached the resolved absolute limit
            if (quota.current_count >= absoluteLimit) {
                // Rollback increments we already did in this call
                for (const prevId of incrementedIds) {
                    await client.query(
                        `UPDATE demographic_quotas
                         SET current_count = current_count - 1, updated_at = NOW()
                         WHERE id = ?`,
                        [prevId]
                    );
                }
                return {
                    valid: false,
                    reason: 'QUOTA_FULL',
                    details: `${quota.demographic_type} quota (${quota.quota_value}) is full`
                };
            }

            await client.query(
                `UPDATE demographic_quotas
                 SET current_count = current_count + 1, updated_at = NOW()
                 WHERE id = ?`,
                [quota.id]
            );

            incrementedIds.push(quota.id);
        }
    }

    return { valid: true };
}

/**
 * @deprecated Use tryIncrementQuota instead — it combines check + increment atomically.
 * Validates participant demographics against disqualifications and quota availability
 */
export async function checkQuotaAvailability(
    researchId: string,
    demographicAnswers: Record<string, string>,
    demographicConfig: Record<string, DemographicConfig>
): Promise<ValidationResult> {
    // First check disqualifications
    const disqualCheck = checkDisqualifications(demographicAnswers, demographicConfig);
    if (disqualCheck.disqualified) {
        return {
            valid: false,
            reason: 'DISQUALIFIED',
            details: disqualCheck.reason
        };
    }

    // Check quota availability (only immediate enforcement blocks in real-time)
    const client = await pool.connect();
    try {
        const quotaChecks = await client.query(
            `SELECT demographic_type, quota_value, quota_limit, current_count, enforcement_mode
             FROM demographic_quotas
             WHERE research_id = ? AND enabled = true`,
            [researchId]
        );

        for (const quota of quotaChecks.rows) {
            const answer = demographicAnswers[quota.demographic_type];
            if (!answer) continue;

            // post_collection quotas are never enforced in real-time
            if (quota.enforcement_mode === 'post_collection') continue;

            if (matchesQuotaValue(answer, quota.quota_value, quota.demographic_type)) {
                if (quota.current_count >= quota.quota_limit) {
                    return {
                        valid: false,
                        reason: 'QUOTA_FULL',
                        details: `${quota.demographic_type} quota (${quota.quota_value}) is full`
                    };
                }
            }
        }

        return { valid: true };
    } finally {
        client.release();
    }
}

/**
 * @deprecated Use tryIncrementQuota instead — it combines check + increment atomically.
 * Increments quota counters for matching demographics
 * Uses SELECT...FOR UPDATE to ensure atomic increment
 */
export async function incrementQuota(
    client: PoolClient,
    researchId: string,
    participantId: string,
    demographicAnswers: Record<string, string>
): Promise<void> {
    // Save participant demographics
    for (const [type, value] of Object.entries(demographicAnswers)) {
        // MySQL compatible: use ON DUPLICATE KEY UPDATE instead of ON CONFLICT
        await client.query(
            `INSERT INTO participant_demographics 
             (research_id, participant_id, demographic_type, demographic_value)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE demographic_value = VALUES(demographic_value)`,
            [researchId, participantId, type, value]
        );
    }

    // Get matching quotas with row lock
    const quotas = await client.query(
        `SELECT id, demographic_type, quota_value 
         FROM demographic_quotas
         WHERE research_id = ? AND enabled = true
         FOR UPDATE`,
        [researchId]
    );

    // Increment matching quotas
    for (const quota of quotas.rows) {
        const answer = demographicAnswers[quota.demographic_type];
        if (!answer) continue;

        if (matchesQuotaValue(answer, quota.quota_value, quota.demographic_type)) {
            await client.query(
                `UPDATE demographic_quotas 
                 SET current_count = current_count + 1, updated_at = NOW()
                 WHERE id = ?`,
                [quota.id]
            );
        }
    }
}

/**
 * @deprecated Not used for public pre-check: quotas may not cover every option per type,
 * so "all buckets full" does not imply no participant can qualify.
 */
export async function checkAllQuotasFull(researchId: string, participantLimit?: number | null): Promise<{ available: boolean; exhaustedType?: string }> {
    const result = await pool.query(
        `SELECT demographic_type, quota_value, quota_limit, quota_type, current_count
         FROM demographic_quotas
         WHERE research_id = ? AND enabled = true`,
        [researchId]
    );

    if (result.rows.length === 0) {
        // No quotas configured → always available
        return { available: true };
    }

    // Group by demographic_type
    const byType = new Map<string, { total: number; full: number }>();
    for (const row of result.rows) {
        const entry = byType.get(row.demographic_type) || { total: 0, full: 0 };
        entry.total++;
        const absoluteLimit = resolveAbsoluteLimit(
            row.quota_limit,
            row.quota_type || 'percentage',
            participantLimit ?? null
        );
        if (row.current_count >= absoluteLimit) {
            entry.full++;
        }
        byType.set(row.demographic_type, entry);
    }

    // If ANY type has ALL values full → no participant can pass
    for (const [type, counts] of byType) {
        if (counts.full === counts.total) {
            return { available: false, exhaustedType: type };
        }
    }

    return { available: true };
}

/**
 * Gets current quota status for a research (for analytics/admin)
 */
export async function getQuotaStatus(researchId: string) {
    const result = await pool.query(
        `SELECT demographic_type, quota_value, quota_limit, quota_type, current_count, enabled, enforcement_mode
         FROM demographic_quotas
         WHERE research_id = ?
         ORDER BY demographic_type, quota_value`,
        [researchId]
    );

    return result.rows;
}
