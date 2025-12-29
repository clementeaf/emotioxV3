import pool from '../../config/database';
import type { PoolClient } from 'pg';

/**
 * Demographic Quota Service
 * Handles quota tracking, validation, and enforcement for research demographic screening
 */

interface QuotaConfig {
    id: string;
    value: string; // e.g., '18-25', 'Male', 'Chile'
    limit: number;
    enabled: boolean;
}

interface DemographicConfig {
    enabled: boolean;
    quotas?: QuotaConfig[];
    disqualifications?: Array<{ id: string; value: string; enabled: boolean }>;
    min?: number;
    max?: number;
    value?: string; // For country/geographic restrictions
    region?: string;
    communes?: string[];
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
             WHERE research_id = $1`,
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

                if (existingMap.has(key)) {
                    // Update existing quota
                    await client.query(
                        `UPDATE demographic_quotas 
                         SET quota_limit = $1, enabled = true, updated_at = CURRENT_TIMESTAMP
                         WHERE id = $2`,
                        [quota.limit, existingMap.get(key)]
                    );
                } else {
                    // Insert new quota
                    await client.query(
                        `INSERT INTO demographic_quotas 
                         (research_id, demographic_type, quota_value, quota_limit, enabled)
                         VALUES ($1, $2, $3, $4, true)`,
                        [researchId, demographicType, quota.value, quota.limit]
                    );
                }
            }
        }

        // Disable quotas that are no longer in config
        for (const [key, id] of existingMap.entries()) {
            if (!configuredQuotas.has(key)) {
                await client.query(
                    'UPDATE demographic_quotas SET enabled = false WHERE id = $1',
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
        if (isNaN(numValue)) return false;

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

            if (config.value === 'Chile' && answer === 'Chile') {
                if (config.region && answers.region !== config.region) {
                    return { disqualified: true, reason: 'Region not allowed' };
                }
                if (config.communes && config.communes.length > 0) {
                    if (!config.communes.includes(answers.commune || '')) {
                        return { disqualified: true, reason: 'Commune not allowed' };
                    }
                }
            }
        }
    }

    return { disqualified: false };
}

/**
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

    // Check quota availability
    const client = await pool.connect();
    try {
        const quotaChecks = await client.query(
            `SELECT demographic_type, quota_value, quota_limit, current_count
             FROM demographic_quotas
             WHERE research_id = $1 AND enabled = true`,
            [researchId]
        );

        for (const quota of quotaChecks.rows) {
            const answer = demographicAnswers[quota.demographic_type];
            if (!answer) continue;

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
        await client.query(
            `INSERT INTO participant_demographics 
             (research_id, participant_id, demographic_type, demographic_value)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (research_id, participant_id, demographic_type)
             DO UPDATE SET demographic_value = EXCLUDED.demographic_value`,
            [researchId, participantId, type, value]
        );
    }

    // Get matching quotas with row lock
    const quotas = await client.query(
        `SELECT id, demographic_type, quota_value 
         FROM demographic_quotas
         WHERE research_id = $1 AND enabled = true
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
                 SET current_count = current_count + 1, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [quota.id]
            );
        }
    }
}

/**
 * Gets current quota status for a research (for analytics/admin)
 */
export async function getQuotaStatus(researchId: string) {
    const result = await pool.query(
        `SELECT demographic_type, quota_value, quota_limit, current_count, enabled
         FROM demographic_quotas
         WHERE research_id = $1
         ORDER BY demographic_type, quota_value`,
        [researchId]
    );

    return result.rows;
}
