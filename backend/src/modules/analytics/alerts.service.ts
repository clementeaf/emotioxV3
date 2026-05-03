/**
 * Research Alerts Service
 * Checks for significant metric changes and stores alerts in research config.
 */

import pool from '../../config/database';

export interface ResearchAlert {
    id: string;
    type: 'nps_drop' | 'negative_cluster' | 'quota_full' | 'completion_milestone' | 'metric_change';
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    createdAt: string;
    dismissed: boolean;
}

/**
 * Get alerts for a research. Stored in config.alerts.
 */
export const getAlerts = async (researchId: string): Promise<ResearchAlert[]> => {
    const result = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    if (!result.rows[0]) return [];

    const config = typeof result.rows[0].config === 'string'
        ? JSON.parse(result.rows[0].config)
        : result.rows[0].config || {};

    return (config.alerts as ResearchAlert[]) || [];
};

/**
 * Dismiss an alert by ID.
 */
export const dismissAlert = async (researchId: string, alertId: string): Promise<void> => {
    const result = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    if (!result.rows[0]) return;

    const config = typeof result.rows[0].config === 'string'
        ? JSON.parse(result.rows[0].config)
        : result.rows[0].config || {};

    const alerts: ResearchAlert[] = config.alerts || [];
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
        alert.dismissed = true;
        config.alerts = alerts;
        await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(config), researchId]);
    }
};

/**
 * Check and generate alerts for a research.
 * Called after responses are saved or status changes.
 */
export const checkAlerts = async (researchId: string): Promise<ResearchAlert[]> => {
    const configResult = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    if (!configResult.rows[0]) return [];

    const config = typeof configResult.rows[0].config === 'string'
        ? JSON.parse(configResult.rows[0].config)
        : configResult.rows[0].config || {};

    const existingAlerts: ResearchAlert[] = config.alerts || [];
    const existingIds = new Set(existingAlerts.map(a => a.id));
    const newAlerts: ResearchAlert[] = [];

    // Check participant count milestones
    const countResult = await pool.query(
        'SELECT COUNT(DISTINCT participant_id) AS cnt FROM responses WHERE research_id = ?',
        [researchId]
    );
    const pCount = Number(countResult.rows[0]?.cnt) || 0;

    for (const milestone of [10, 25, 50, 100, 250, 500]) {
        const alertId = `milestone-${milestone}`;
        if (pCount >= milestone && !existingIds.has(alertId)) {
            newAlerts.push({
                id: alertId,
                type: 'completion_milestone',
                severity: 'info',
                title: `${milestone} Participants Reached`,
                message: `Your research has reached ${milestone} participants.`,
                createdAt: new Date().toISOString(),
                dismissed: false,
            });
        }
    }

    // Check NPS trend (compare last 5 vs previous 5)
    const npsResult = await pool.query(
        `SELECT CAST(JSON_UNQUOTE(resp.value) AS DECIMAL) AS score, resp.created_at
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ? AND m.name = 'NPS'
           AND resp.component_id IN ('answer','scale','choice')
         ORDER BY resp.created_at DESC LIMIT 20`,
        [researchId]
    );

    if (npsResult.rows.length >= 10) {
        const recent5 = npsResult.rows.slice(0, 5).map(r => Number((r as { score: number }).score));
        const prev5 = npsResult.rows.slice(5, 10).map(r => Number((r as { score: number }).score));
        const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length;
        const prevAvg = prev5.reduce((a, b) => a + b, 0) / prev5.length;
        const drop = prevAvg - recentAvg;

        if (drop >= 2 && !existingIds.has('nps-drop')) {
            newAlerts.push({
                id: 'nps-drop',
                type: 'nps_drop',
                severity: 'warning',
                title: 'NPS Score Declining',
                message: `Recent NPS average (${recentAvg.toFixed(1)}) is ${drop.toFixed(1)} points lower than previous period (${prevAvg.toFixed(1)}).`,
                createdAt: new Date().toISOString(),
                dismissed: false,
            });
        }
    }

    // Check negative sentiment cluster
    const sentResult = await pool.query(
        `SELECT COUNT(*) AS neg_count
         FROM responses
         WHERE research_id = ?
           AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'negative'
           AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
        [researchId]
    );
    const recentNeg = Number(sentResult.rows[0]?.neg_count) || 0;

    if (recentNeg >= 5 && !existingIds.has('neg-cluster')) {
        newAlerts.push({
            id: 'neg-cluster',
            type: 'negative_cluster',
            severity: 'critical',
            title: 'Negative Sentiment Spike',
            message: `${recentNeg} negative responses detected in the last 24 hours.`,
            createdAt: new Date().toISOString(),
            dismissed: false,
        });
    }

    if (newAlerts.length > 0) {
        config.alerts = [...existingAlerts, ...newAlerts];
        await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(config), researchId]);
    }

    return [...existingAlerts.filter(a => !a.dismissed), ...newAlerts];
};
