import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import { getMediaPath } from '../../config/local-storage';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

interface ComplexityResult {
    suggestedSeconds: number;
    reason: string;
}

const FALLBACK: ComplexityResult = { suggestedSeconds: 10, reason: 'Default recommendation' };

export async function analyzeStimulusComplexity(s3Key: string): Promise<ComplexityResult> {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return FALLBACK;

    const filePath = getMediaPath(s3Key);
    if (!fs.existsSync(filePath)) return FALLBACK;

    const imageBuffer = fs.readFileSync(filePath);
    const ext = s3Key.split('.').pop()?.toLowerCase() || 'png';
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
        : ext === 'webp' ? 'image/webp'
        : ext === 'gif' ? 'image/gif'
        : 'image/png';

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const prompt = `You are an eye-tracking research expert. Analyze this image and determine the optimal display time for a webcam-based eye-tracking study (zone-level accuracy, ~30Hz sampling).

Consider: visual complexity, number of distinct elements, text density, layout structure, information hierarchy.

Respond ONLY with valid JSON, no markdown:
{"suggestedSeconds": <number between 5 and 30>, "reason": "<one sentence in Spanish explaining why>"}`;

    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
        ]);
        const text = result.response.text().trim();
        const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(cleaned) as ComplexityResult;
        const seconds = Math.max(5, Math.min(30, Math.round(parsed.suggestedSeconds)));
        return { suggestedSeconds: seconds, reason: parsed.reason || '' };
    } catch (err) {
        console.error('Stimulus complexity analysis failed:', err);
        return FALLBACK;
    }
}
