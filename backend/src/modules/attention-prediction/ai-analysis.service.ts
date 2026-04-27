/**
 * AI Analysis Service
 * Uses Gemini 2.0 Flash (primary) with GPT-4o fallback to analyze visual
 * attention patterns in images. Receives the original image + TranSalNet
 * saliency data to produce structured UX insights.
 *
 * Gemini Flash is ~30x cheaper than GPT-4o. Falls back to GPT-4o on failure.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import type { AiAnalysisResult } from './ai-analysis.types';

// ─── Config ─────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

// ─── Shared prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert in visual attention analysis, UX design, and neuro-design principles (Gestalt, cognitive load, visual hierarchy). You analyze images to predict where users will look, how attention flows, and provide actionable design recommendations.

You combine saliency map data (from a computational model) with your visual analysis expertise to produce structured, precise reports.

Always respond with valid JSON matching the exact schema provided. All coordinate values must be percentages (0-100) relative to the image dimensions. Respond in the SAME LANGUAGE as any text visible in the image (Spanish if Spanish content, English if English, etc.).`;

const buildUserPrompt = (
    heatmapSummary: string,
    fileName: string
): string => `Analyze this image for visual attention patterns. The image is from a UX research study file "${fileName}".

A computational saliency model (TranSalNet) has already generated attention data. Here are the top attention hotspots (coordinates as percentage of image width/height, value 0-1 = attention intensity):

${heatmapSummary}

Using both the image content and the saliency data above, provide a comprehensive visual attention analysis.

Return a JSON object with exactly this structure:
{
  "context": {
    "type": "web|mobile|print|poster|packaging|billboard|social_media|other",
    "description": "Brief description of what this image is (e.g., 'E-commerce product landing page')"
  },
  "confidence": 85,
  "attentionScore": 72,
  "attentionScoreLabel": "High",
  "autoAois": [
    {
      "label": "Hero Image",
      "x": 10,
      "y": 5,
      "width": 80,
      "height": 40,
      "attentionLevel": "high",
      "description": "Main visual element drawing initial attention"
    }
  ],
  "attentionFlow": {
    "entryPoint": "Top-left logo area",
    "exitPoint": "Bottom-right footer",
    "leakAreas": ["Empty whitespace on the right sidebar"],
    "flowPath": ["Logo", "Hero image", "Headline", "CTA button", "Product details"],
    "summary": "Attention enters through the logo, flows naturally to the hero image, then down to the CTA."
  },
  "gazePath": [
    { "order": 1, "x": 15, "y": 8, "label": "Logo", "duration": "brief" },
    { "order": 2, "x": 50, "y": 30, "label": "Hero image", "duration": "long" }
  ],
  "neuroInsights": [
    {
      "principle": "F-Pattern Reading",
      "finding": "Content follows the natural F-pattern reading behavior",
      "recommendation": "Place key CTAs along the F-pattern hotspots"
    }
  ],
  "methodology": "Combined TranSalNet computational saliency with AI visual analysis for context-aware attention prediction."
}

Rules:
- confidence: 0-100, how confident you are in this analysis
- attentionScore: 0-100, how effectively this design captures and guides attention (higher = better design)
- attentionScoreLabel: "Low" (<30), "Medium" (30-59), "High" (60-79), "Very High" (80-100)
- autoAois: 3-8 key areas of interest. x,y = top-left corner, width,height = dimensions, ALL in percentage (0-100)
- attentionLevel: "high" (strong saliency), "medium", "low" (weak but notable)
- gazePath: 5-12 predicted fixation points in chronological viewing order. duration: "brief" (<200ms), "moderate" (200-500ms), "long" (>500ms)
- neuroInsights: 3-6 insights based on Gestalt principles, cognitive load, visual hierarchy, contrast, color theory, etc.
- leakAreas: areas where attention dissipates or exits the design unintentionally
- flowPath: narrative path of visual attention through the design
- Return ONLY valid JSON, no markdown fences`;

// ─── Helpers ────────────────────────────────────────────────────────

const summarizeHeatmap = (
    heatmapData: Array<{ x: number; y: number; value: number }>
): string => {
    const sorted = [...heatmapData].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 15);
    if (top.length === 0) return 'No significant attention hotspots detected.';
    return top.map(
        (p, i) => `  ${i + 1}. x=${p.x.toFixed(1)}%, y=${p.y.toFixed(1)}%, intensity=${p.value.toFixed(3)}`
    ).join('\n');
};

const imageToBase64 = async (imagePath: string): Promise<{ base64: string; mimeType: string }> => {
    const buffer = await sharp(imagePath)
        .resize(1024, undefined, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' };
};

// ─── Gemini provider ────────────────────────────────────────────────

const analyzeWithGemini = async (
    base64: string,
    mimeType: string,
    userPrompt: string,
    fileName: string
): Promise<AiAnalysisResult> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    const client = new GoogleGenerativeAI(apiKey);

    console.log(`[AI Analysis] Trying Gemini (${GEMINI_MODEL}) for "${fileName}"...`);

    const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 4000,
        },
    });

    const result = await model.generateContent([
        { inlineData: { data: base64, mimeType } },
        { text: userPrompt },
    ]);

    return JSON.parse(result.response.text()) as AiAnalysisResult;
};

// ─── OpenAI provider (fallback) ─────────────────────────────────────

const analyzeWithOpenAI = async (
    base64: string,
    mimeType: string,
    userPrompt: string,
    fileName: string
): Promise<AiAnalysisResult> => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const dataUri = `data:${mimeType};base64,${base64}`;

    console.log(`[AI Analysis] Trying OpenAI (${OPENAI_MODEL}) for "${fileName}"...`);

    const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: dataUri, detail: 'high' } },
                    { type: 'text', text: userPrompt },
                ],
            },
        ],
    });

    return JSON.parse(response.choices[0]?.message?.content || '') as AiAnalysisResult;
};

// ─── Public API ─────────────────────────────────────────────────────

export const analyzeAttentionWithAI = async (
    imagePath: string,
    heatmapData: Array<{ x: number; y: number; value: number }>,
    fileName: string
): Promise<AiAnalysisResult> => {
    if (!hasGemini() && !hasOpenAI()) {
        throw new Error('No AI API key configured (GEMINI_API_KEY or OPENAI_API_KEY)');
    }

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    const { base64, mimeType } = await imageToBase64(imagePath);
    const heatmapSummary = summarizeHeatmap(heatmapData);
    const userPrompt = buildUserPrompt(heatmapSummary, fileName);

    let result: AiAnalysisResult;

    // Try Gemini first (cheaper), fall back to OpenAI
    if (hasGemini()) {
        try {
            result = await analyzeWithGemini(base64, mimeType, userPrompt, fileName);
        } catch (geminiErr) {
            console.warn('[AI Analysis] Gemini failed, falling back to OpenAI:', geminiErr instanceof Error ? geminiErr.message : geminiErr);
            if (!hasOpenAI()) throw geminiErr;
            result = await analyzeWithOpenAI(base64, mimeType, userPrompt, fileName);
        }
    } else {
        result = await analyzeWithOpenAI(base64, mimeType, userPrompt, fileName);
    }

    result.analyzedAt = new Date().toISOString();

    console.log(
        `[AI Analysis] Complete: score=${result.attentionScore}, ` +
        `aois=${result.autoAois?.length || 0}, gazePath=${result.gazePath?.length || 0}`
    );

    return result;
};
