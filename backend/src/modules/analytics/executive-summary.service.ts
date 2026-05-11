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

export const generateExecutiveSummary = async (researchId: string, participantIds?: string[]): Promise<ExecutiveSummary> => {
    // Build participant filter clause if provided
    const hasPidFilter = participantIds && participantIds.length > 0;
    const pidClause = hasPidFilter ? ` AND resp.participant_id IN (${participantIds.map(() => '?').join(',')})` : '';
    const pidParams = hasPidFilter ? [...participantIds] : [];

    // ── 1. Research metadata ──────────────────────────────────────────
    const [researchResult, responseStats, sentimentStats] = await Promise.all([
        pool.query(
            `SELECT r.name, r.status, r.config,
                    rt.name AS type_name, rtech.name AS technique_name
             FROM researches r
             LEFT JOIN research_types rt ON rt.id = r.research_type_id
             LEFT JOIN research_techniques rtech ON rtech.id = r.research_technique_id
             WHERE r.id = ?`,
            [researchId]
        ),
        pool.query(
            `SELECT COUNT(*) AS total, COUNT(DISTINCT participant_id) AS participants
             FROM responses resp WHERE resp.research_id = ?${pidClause}`,
            [researchId, ...pidParams]
        ),
        pool.query(
            `SELECT
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'positive' THEN 1 ELSE 0 END) AS positive,
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'negative' THEN 1 ELSE 0 END) AS negative,
                SUM(CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.sentiment')) = 'neutral' THEN 1 ELSE 0 END) AS neutral
             FROM responses resp WHERE resp.research_id = ? AND JSON_EXTRACT(metadata, '$.sentiment') IS NOT NULL${pidClause}`,
            [researchId, ...pidParams]
        ),
    ]);

    const research = researchResult.rows[0] as { name: string; status: string; config: string; type_name: string; technique_name: string } | undefined;
    const stats = responseStats.rows[0] as { total: number; participants: number } | undefined;
    const sentiment = sentimentStats.rows[0] as { positive: number; negative: number; neutral: number } | undefined;

    const participantCount = Number(stats?.participants) || 0;
    const responseCount = Number(stats?.total) || 0;

    // ── 2. SmartVOC scores ────────────────────────────────────────────
    const scoresResult = await pool.query(
        `SELECT m.name AS metric,
                AVG(CAST(JSON_UNQUOTE(resp.value) AS DECIMAL(10,2))) AS avg_score,
                COUNT(*) AS n
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ? AND m.name IN ('NPS','CSAT','CES','CV','NEV')
           AND resp.component_id IN ('answer','scale','choice')${pidClause}
         GROUP BY m.name`,
        [researchId, ...pidParams]
    );

    const metricsObj: ExecutiveSummary['metrics'] = {
        participantCount,
        responseCount,
        completionRate: 0,
    };

    const smartvocLines: string[] = [];
    for (const row of scoresResult.rows) {
        const r = row as { metric: string; avg_score: number; n: number };
        const val = Math.round(Number(r.avg_score) * 10) / 10;
        if (r.metric === 'NPS') metricsObj.nps = val;
        if (r.metric === 'CSAT') metricsObj.csat = val;
        if (r.metric === 'CES') metricsObj.ces = val;
        smartvocLines.push(`- ${r.metric}: promedio ${val} (n=${r.n})`);
    }

    // ── 3. VOC + text responses (verbatim) ────────────────────────────
    const vocTexts = await pool.query(
        `SELECT m.name AS module_name, JSON_UNQUOTE(resp.value) AS text,
                JSON_UNQUOTE(JSON_EXTRACT(resp.metadata, '$.sentiment')) AS sentiment
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ? AND m.name IN ('VOC','Short Text','Long Text')
           AND resp.component_id IN ('answer','text')
           AND JSON_UNQUOTE(resp.value) IS NOT NULL
           AND JSON_UNQUOTE(resp.value) != ''${pidClause}
         ORDER BY resp.created_at DESC
         LIMIT 80`,
        [researchId, ...pidParams]
    );

    const verbatimLines = (vocTexts.rows as Array<{ module_name: string; text: string; sentiment: string }>)
        .map(r => `[${r.module_name}] (${r.sentiment || '?'}) "${r.text}"`)
        .join('\n');

    // ── 4. Screener results ───────────────────────────────────────────
    const screenerResult = await pool.query(
        `SELECT JSON_UNQUOTE(resp.value) AS choice, COUNT(*) AS n
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ? AND m.name = 'Screener'
           AND resp.component_id = 'answer'${pidClause}
         GROUP BY JSON_UNQUOTE(resp.value)`,
        [researchId, ...pidParams]
    );
    const screenerLines = (screenerResult.rows as Array<{ choice: string; n: number }>)
        .map(r => `- ${r.choice}: ${r.n}`)
        .join('\n');

    // ── 5. Cognitive Tasks (choice distribution, scale averages) ──────
    const choiceResult = await pool.query(
        `SELECT m.name AS module_name, JSON_UNQUOTE(resp.value) AS choice, COUNT(*) AS n
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ?
           AND m.name IN ('Single Choice','Multiple Choice','Preference Test')
           AND resp.component_id IN ('answer','choice','selected')
           AND JSON_UNQUOTE(resp.value) IS NOT NULL${pidClause}
         GROUP BY m.name, JSON_UNQUOTE(resp.value)
         ORDER BY m.name, n DESC`,
        [researchId, ...pidParams]
    );
    const choiceLines = (choiceResult.rows as Array<{ module_name: string; choice: string; n: number }>)
        .map(r => `- [${r.module_name}] ${r.choice}: ${r.n}`)
        .join('\n');

    const scaleResult = await pool.query(
        `SELECT m.name AS module_name,
                AVG(CAST(JSON_UNQUOTE(resp.value) AS DECIMAL(10,2))) AS avg_val,
                MIN(CAST(JSON_UNQUOTE(resp.value) AS DECIMAL(10,2))) AS min_val,
                MAX(CAST(JSON_UNQUOTE(resp.value) AS DECIMAL(10,2))) AS max_val,
                COUNT(*) AS n
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ?
           AND m.name = 'Linear Scale'
           AND resp.component_id IN ('answer','scale')${pidClause}
         GROUP BY m.name, m.id`,
        [researchId, ...pidParams]
    );
    const scaleLines = (scaleResult.rows as Array<{ module_name: string; avg_val: number; min_val: number; max_val: number; n: number }>)
        .map(r => `- ${r.module_name}: promedio ${Math.round(Number(r.avg_val) * 10) / 10}, rango ${r.min_val}-${r.max_val} (n=${r.n})`)
        .join('\n');

    // ── 6. Ranking results ────────────────────────────────────────────
    const rankingResult = await pool.query(
        `SELECT m.name AS module_name, JSON_UNQUOTE(resp.value) AS ranking_data
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ?
           AND m.name = 'Ranking'
           AND resp.component_id = 'items'${pidClause}
         LIMIT 50`,
        [researchId, ...pidParams]
    );
    let rankingSummary = '';
    if (rankingResult.rows.length > 0) {
        const positionCounts = new Map<string, number[]>();
        for (const row of rankingResult.rows as Array<{ module_name: string; ranking_data: string }>) {
            try {
                const items: string[] = JSON.parse(row.ranking_data);
                items.forEach((item, pos) => {
                    const counts = positionCounts.get(item) || [];
                    counts[pos] = (counts[pos] || 0) + 1;
                    positionCounts.set(item, counts);
                });
            } catch { /* skip malformed */ }
        }
        rankingSummary = [...positionCounts.entries()]
            .map(([item, counts]) => {
                const firstCount = counts[0] || 0;
                return `- "${item}": ${firstCount}× en 1er lugar`;
            })
            .join('\n');
    }

    // ── 7. IAT summary (reaction times) ──────────────────────────────
    const iatResult = await pool.query(
        `SELECT m.name AS module_name,
                AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(resp.metadata, '$.rt')) AS DECIMAL)) AS avg_rt,
                COUNT(*) AS n
         FROM responses resp
         JOIN modules m ON m.id = resp.module_id
         WHERE resp.research_id = ?
           AND m.name IN ('Attribute Testing','Comparing Attribute','Objects Comparing')
           AND JSON_EXTRACT(resp.metadata, '$.rt') IS NOT NULL${pidClause}
         GROUP BY m.name`,
        [researchId, ...pidParams]
    );
    const iatLines = (iatResult.rows as Array<{ module_name: string; avg_rt: number; n: number }>)
        .map(r => `- ${r.module_name}: RT promedio ${Math.round(Number(r.avg_rt))}ms (n=${r.n})`)
        .join('\n');

    // ── 8. Demographics snapshot ──────────────────────────────────────
    const demoResult = await pool.query(
        `SELECT resp.component_id AS field, JSON_UNQUOTE(resp.value) AS val, COUNT(*) AS n
         FROM responses resp
         WHERE resp.research_id = ? AND resp.module_id = 'demographics'${pidClause}
         GROUP BY resp.component_id, JSON_UNQUOTE(resp.value)
         ORDER BY resp.component_id, n DESC`,
        [researchId, ...pidParams]
    );
    const demoByField = new Map<string, string[]>();
    for (const row of demoResult.rows as Array<{ field: string; val: string; n: number }>) {
        const entries = demoByField.get(row.field) || [];
        entries.push(`${row.val} (${row.n})`);
        demoByField.set(row.field, entries);
    }
    const demoLines = [...demoByField.entries()]
        .map(([field, values]) => `- ${field}: ${values.slice(0, 5).join(', ')}`)
        .join('\n');

    // ── 9. Benchmarks ────────────────────────────────────────────────
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
    const benchmarkLines = (benchmarkResult.rows as Array<{ metric: string; avg_score: number; research_count: number }>)
        .map(r => `- ${r.metric}: promedio histórico ${Math.round(Number(r.avg_score) * 10) / 10} (${r.research_count} estudios)`)
        .join('\n');

    // ── 10. Build prompt ──────────────────────────────────────────────
    const sentimentObj = {
        positive: Number(sentiment?.positive) || 0,
        negative: Number(sentiment?.negative) || 0,
        neutral: Number(sentiment?.neutral) || 0,
    };

    const sections: string[] = [];

    sections.push(`ESTUDIO: "${research?.name}" (${research?.type_name || 'Tipo desconocido'}, ${research?.technique_name || ''})
Estado: ${research?.status}
Participantes: ${participantCount}, Respuestas totales: ${responseCount}`);

    if (smartvocLines.length > 0) {
        sections.push(`MÉTRICAS SMARTVOC:\n${smartvocLines.join('\n')}`);
    }

    if (sentimentObj.positive + sentimentObj.negative + sentimentObj.neutral > 0) {
        sections.push(`SENTIMIENTO GLOBAL: ${sentimentObj.positive} positivos, ${sentimentObj.negative} negativos, ${sentimentObj.neutral} neutrales`);
    }

    if (screenerLines) {
        sections.push(`SCREENER (filtro de participantes):\n${screenerLines}`);
    }

    if (choiceLines) {
        sections.push(`TAREAS COGNITIVAS — Opciones elegidas:\n${choiceLines}`);
    }

    if (scaleLines) {
        sections.push(`TAREAS COGNITIVAS — Escalas:\n${scaleLines}`);
    }

    if (rankingSummary) {
        sections.push(`RANKING:\n${rankingSummary}`);
    }

    if (iatLines) {
        sections.push(`ASOCIACIÓN IMPLÍCITA (IAT):\n${iatLines}`);
    }

    if (verbatimLines) {
        sections.push(`VERBATIMS DE PARTICIPANTES (respuestas textuales literales):\n${verbatimLines.slice(0, 4000)}`);
    }

    if (demoLines) {
        sections.push(`DEMOGRAFÍA (resumen):\n${demoLines}`);
    }

    if (benchmarkLines) {
        sections.push(`BENCHMARKS HISTÓRICOS:\n${benchmarkLines}`);
    }

    const prompt = `Eres un analista experto en investigación UX. Genera un resumen ejecutivo EN ESPAÑOL para este estudio.

IMPORTANTE:
- Enfócate en los RESULTADOS: qué dicen los datos, qué patrones emergen, qué sienten los participantes.
- Usa los verbatims textuales como evidencia — cita frases clave entre comillas.
- La demografía es solo contexto, NO el foco del resumen.
- Compara con benchmarks históricos si hay datos disponibles.
- Sé directo y accionable. Cada hallazgo debe ser específico, no genérico.

DATOS DEL ESTUDIO:
${sections.join('\n\n')}

Responde en JSON:
{
  "overview": "2-3 oraciones de resumen ejecutivo centrado en hallazgos clave de resultados",
  "keyFindings": ["hallazgo 1 con evidencia", "hallazgo 2", "hallazgo 3", "hallazgo 4", "hallazgo 5"],
  "recommendations": ["recomendación accionable 1", "recomendación 2", "recomendación 3"]
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
        overview: parsed.overview || 'No hay resumen disponible.',
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
