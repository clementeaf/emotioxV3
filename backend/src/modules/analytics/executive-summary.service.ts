/**
 * Executive Summary Service
 * Generates an AI-powered executive summary from all research analytics data.
 * Cached in researches.config.executiveSummary.
 */

import OpenAI from 'openai';
import pool from '../../config/database';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
const LLM_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

export interface ExecutiveSummary {
    generatedAt: string;
    overview: string;
    keyFindings: string[];
    recommendations: string[];
    metrics: {
        participantCount: number;
        responseCount: number;
        completionRate: number;
        nps?: number;
        csat?: number;
        ces?: number;
    };
    sentiment?: {
        positive: number;
        negative: number;
        neutral: number;
    };
}

export const getExecutiveSummary = async (researchId: string): Promise<ExecutiveSummary | null> => {
    const result = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    if (!result.rows[0]) return null;

    const config = typeof result.rows[0].config === 'string'
        ? JSON.parse(result.rows[0].config)
        : result.rows[0].config || {};

    return config.executiveSummary || null;
};

export const generateExecutiveSummary = async (researchId: string): Promise<ExecutiveSummary> => {
    // Gather all metrics
    const [researchResult, responseStats, vocTexts, sentimentStats] = await Promise.all([
        pool.query(
            `SELECT r.name, r.status, rt.name AS type_name, rtech.name AS technique_name
             FROM researches r
             LEFT JOIN research_types rt ON rt.id = r.research_type_id
             LEFT JOIN research_techniques rtech ON rtech.id = r.research_technique_id
             WHERE r.id = ?`,
            [researchId]
        ),
        pool.query(
            `SELECT COUNT(*) AS total, COUNT(DISTINCT participant_id) AS participants
             FROM responses WHERE research_id = ?`,
            [researchId]
        ),
        pool.query(
            `SELECT JSON_UNQUOTE(resp.value) AS text, resp.metadata
             FROM responses resp
             JOIN modules m ON m.id = resp.module_id
             WHERE resp.research_id = ? AND m.name IN ('VOC','Short Text','Long Text')
               AND resp.component_id IN ('answer','text')
             LIMIT 100`,
            [researchId]
        ),
        pool.query(
            `SELECT
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'negative' THEN 1 ELSE 0 END) AS negative,
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'neutral' THEN 1 ELSE 0 END) AS neutral
             FROM responses WHERE research_id = ? AND JSON_EXTRACT(metadata, '$.sentiment') IS NOT NULL`,
            [researchId]
        ),
    ]);

    // Historical benchmarks (avg scores across all researches of same type)
    const benchmarkResult = await pool.query(
        `SELECT m.name AS metric,
                AVG(CAST(JSON_UNQUOTE(resp.value) AS DECIMAL)) AS avg_score,
                COUNT(DISTINCT resp.research_id) AS research_count
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         JOIN researches r ON r.id = resp.research_id
         WHERE r.deleted_at IS NULL
           AND r.research_type_id = (SELECT research_type_id FROM researches WHERE id = ?)
           AND r.id != ?
           AND m.name IN ('NPS','CSAT','CES')
           AND resp.component_id IN ('answer','scale','choice')
         GROUP BY m.name`,
        [researchId, researchId]
    );

    // SmartVOC scores
    const scoresResult = await pool.query(
        `SELECT m.name AS metric, AVG(CAST(JSON_UNQUOTE(resp.value) AS DECIMAL)) AS avg_score
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ? AND m.name IN ('NPS','CSAT','CES')
           AND resp.component_id IN ('answer','scale','choice')
         GROUP BY m.name`,
        [researchId]
    );

    const research = researchResult.rows[0];
    const stats = responseStats.rows[0];
    const sentiment = sentimentStats.rows[0];

    const participantCount = Number(stats?.participants) || 0;
    const responseCount = Number(stats?.total) || 0;

    const metricsObj: ExecutiveSummary['metrics'] = {
        participantCount,
        responseCount,
        completionRate: 0,
    };

    for (const row of scoresResult.rows) {
        const r = row as { metric: string; avg_score: number };
        const val = Math.round(Number(r.avg_score) * 10) / 10;
        if (r.metric === 'NPS') metricsObj.nps = val;
        if (r.metric === 'CSAT') metricsObj.csat = val;
        if (r.metric === 'CES') metricsObj.ces = val;
    }

    const sentimentObj = {
        positive: Number(sentiment?.positive) || 0,
        negative: Number(sentiment?.negative) || 0,
        neutral: Number(sentiment?.neutral) || 0,
    };

    // Build prompt
    const vocSample = vocTexts.rows.slice(0, 50).map((r) => (r as { text: string }).text).join('\n');
    const prompt = `You are a UX research analyst. Generate an executive summary for this research study.

Study: "${research?.name}" (${research?.type_name || 'Unknown type'}, ${research?.technique_name || ''})
Participants: ${participantCount}, Responses: ${responseCount}
${metricsObj.nps !== undefined ? `NPS: ${metricsObj.nps}` : ''}
${metricsObj.csat !== undefined ? `CSAT: ${metricsObj.csat}` : ''}
${metricsObj.ces !== undefined ? `CES: ${metricsObj.ces}` : ''}
Sentiment: ${sentimentObj.positive} positive, ${sentimentObj.negative} negative, ${sentimentObj.neutral} neutral
${benchmarkResult.rows.length > 0 ? `\nHistorical benchmarks (avg across ${(benchmarkResult.rows[0] as { research_count: number }).research_count} similar studies):\n${benchmarkResult.rows.map(r => {
    const br = r as { metric: string; avg_score: number };
    return `- ${br.metric}: ${Math.round(Number(br.avg_score) * 10) / 10}`;
}).join('\n')}` : ''}

${vocSample ? `Sample participant feedback:\n${vocSample.slice(0, 3000)}` : 'No text feedback available.'}

Compare current metrics against historical benchmarks when available. Highlight improvements or regressions.

Respond in JSON:
{
  "overview": "2-3 sentence high-level summary including benchmark comparison if data available",
  "keyFindings": ["finding 1", "finding 2", "finding 3", "finding 4", "finding 5"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "benchmarkComparison": "1-2 sentences comparing this study's metrics to historical averages, or null if no benchmark data"
}`;

    const response = await client.chat.completions.create({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const summary: ExecutiveSummary = {
        generatedAt: new Date().toISOString(),
        overview: parsed.overview || 'No summary available.',
        keyFindings: parsed.keyFindings || [],
        recommendations: parsed.recommendations || [],
        metrics: metricsObj,
        sentiment: sentimentObj,
    };

    // Cache in config
    const configResult = await pool.query('SELECT config FROM researches WHERE id = ?', [researchId]);
    const config = typeof configResult.rows[0]?.config === 'string'
        ? JSON.parse(configResult.rows[0].config)
        : configResult.rows[0]?.config || {};
    config.executiveSummary = summary;
    await pool.query('UPDATE researches SET config = ? WHERE id = ?', [JSON.stringify(config), researchId]);

    return summary;
};
