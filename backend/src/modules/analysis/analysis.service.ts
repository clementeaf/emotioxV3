import pool from '../../config/database';

export const getModules = async () => {
    const query = `
    SELECT id, name, description, module_type, config, is_active
    FROM analysis_modules
    WHERE is_active = true
    ORDER BY name
  `;
    const result = await pool.query(query);
    return result.rows;
};

export const analyzeQuestion = async (questionId: string, moduleType: string) => {
    // Get all responses for this question
    const query = `
    SELECT r.answer, r.metadata, r.created_at, r.participant_id
    FROM responses r
    WHERE r.question_id = ?
    ORDER BY r.created_at ASC
  `;
    const result = await pool.query(query, [questionId]);

    // Basic analysis based on module type
    const responses = result.rows;

    switch (moduleType) {
        case 'distribution_chart':
            return analyzeDistribution(responses);
        case 'basic_stats':
            return calculateBasicStats(responses);
        default:
            return { responses, count: responses.length };
    }
};

const analyzeDistribution = (responses: any[]) => {
    const distribution: any = {};
    responses.forEach(r => {
        const value = r.answer.value || r.answer;
        distribution[value] = (distribution[value] || 0) + 1;
    });
    return { distribution, total: responses.length };
};

const calculateBasicStats = (responses: any[]) => {
    const values = responses.map(r => parseFloat(r.answer.value || r.answer)).filter(v => !isNaN(v));
    if (values.length === 0) return { error: 'No numeric values found' };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const sorted = values.sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = Math.min(...values);
    const max = Math.max(...values);

    return { mean, median, min, max, count: values.length };
};
