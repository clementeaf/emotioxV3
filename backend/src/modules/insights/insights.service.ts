/**
 * Insights Analysis Service
 * Uses OpenAI GPT-4o to generate sentiment analysis summaries and actionable insights
 * from text entries uploaded by researchers.
 */

import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export interface InsightsAnalysis {
    sentiment: {
        summary: string;
        description: string;
        actionables: string[];
    };
    themes: Array<{ name: string; count: number; description: string; magnitude: number; sentimentScore: number }>;
    keywords: Array<{ word: string; count: number; sentiment: string }>;
}

/**
 * Analyzes text entries using GPT-4o to generate:
 * - Sentiment summary with descriptive paragraphs and actionables
 * - Theme extraction with magnitude and sentiment scores
 * - Keyword extraction with sentiment
 */
export const analyzeInsights = async (
    entries: Array<{ text: string; mood: string }>,
    fileName: string
): Promise<InsightsAnalysis> => {
    if (!process.env.OPENAI_API_KEY) {
        console.warn('[Insights] OPENAI_API_KEY not set, returning empty analysis');
        return emptyAnalysis();
    }

    // Prepare text sample (limit to avoid token overflow)
    const sampleTexts = entries.slice(0, 100).map(e => e.text).join('\n');
    const moodDistribution = entries.reduce((acc, e) => {
        acc[e.mood] = (acc[e.mood] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const prompt = `You are a UX research analyst. Analyze the following text data from a research study file "${fileName}".

Total entries: ${entries.length}
Mood distribution: ${JSON.stringify(moodDistribution)}

Text entries:
${sampleTexts}

Respond in the SAME LANGUAGE as the text entries (Spanish if Spanish, English if English).

Return a JSON object with exactly this structure:
{
  "sentiment": {
    "summary": "One paragraph summarizing the overall sentiment and key findings",
    "description": "Two paragraphs providing deeper analysis of patterns, notable observations, and context",
    "actionables": ["actionable insight 1", "actionable insight 2", "actionable insight 3"]
  },
  "themes": [
    { "name": "theme name", "count": approximate_count, "description": "brief description", "magnitude": 0.89, "sentimentScore": 0.75 }
  ],
  "keywords": [
    { "word": "keyword", "count": approximate_count, "sentiment": "positive|negative|neutral" }
  ]
}

Rules:
- 3-5 themes, sorted by relevance. magnitude is 0-1 (importance). sentimentScore is -1 to +1 (negative to positive).
- 8-12 keywords, sorted by frequency
- 3-5 actionables, specific and practical
- Be concise but insightful
- Return ONLY valid JSON, no markdown`;

    try {
        console.log(`[Insights] Calling OpenAI for file "${fileName}" with ${entries.length} entries...`);

        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            max_tokens: 2000,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: 'You are a UX research analyst. Always respond with valid JSON.' },
                { role: 'user', content: prompt },
            ],
        });

        const text = response.choices[0]?.message?.content || '';
        const parsed = JSON.parse(text) as InsightsAnalysis;

        console.log(`[Insights] Analysis complete: ${parsed.themes?.length || 0} themes, ${parsed.keywords?.length || 0} keywords`);
        return parsed;
    } catch (err) {
        console.error('[Insights] OpenAI API error:', err);
        return emptyAnalysis();
    }
};

const emptyAnalysis = (): InsightsAnalysis => ({
    sentiment: { summary: '', description: '', actionables: [] },
    themes: [],
    keywords: [],
});
