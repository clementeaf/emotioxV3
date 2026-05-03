/**
 * AI Analysis Service
 * Uses Gemini 2.0 Flash (primary) with GPT-4o fallback to analyze visual
 * attention patterns in images. Receives the original image + TranSalNet
 * saliency data to produce structured UX insights.
 *
 * Gemini Flash is ~30x cheaper than GPT-4o. Falls back to GPT-4o on failure.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { applyFocalEqualization, applyStochasticJitter } from './attention-prediction.service';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import type { AiAnalysisResult } from './ai-analysis.types';

// ─── Config ─────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
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
  "gazePathRoutes": [
    {
      "id": "typical-scan",
      "name": "Typical Scan (Z-Pattern)",
      "description": "Natural reading/scanning pattern most viewers follow",
      "fixations": [
        { "order": 1, "x": 10, "y": 5, "label": "Top-left entry", "duration": "brief" },
        { "order": 2, "x": 80, "y": 5, "label": "Top-right scan", "duration": "moderate" }
      ]
    },
    {
      "id": "group-scan",
      "name": "Group/Category Scan",
      "description": "Scanning by visual groups, brands, or categories",
      "fixations": [
        { "order": 1, "x": 25, "y": 30, "label": "First group", "duration": "long" }
      ]
    },
    {
      "id": "novelty-search",
      "name": "Novelty/Differentiation Search",
      "description": "Seeking unique, novel, or contrasting elements",
      "fixations": [
        { "order": 1, "x": 60, "y": 50, "label": "Standout element", "duration": "long" }
      ]
    }
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
- gazePathRoutes: EXACTLY 3 distinct viewing strategies. Each with 5-10 fixation points. The 3 routes must represent different cognitive strategies for viewing this specific image.
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

// ─── Semantic Saliency Grid ─────────────────────────────────────────

const SEMANTIC_GRID_PROMPT = `Analyze this image and predict human visual attention based on SEMANTIC content (objects, text, faces, brand logos, high-contrast elements, novelty).

Return a JSON object with a "grid" property containing a 10x8 2D array (10 columns × 8 rows) of attention weights (0.0 to 1.0).
Each cell represents a region of the image. 1.0 = highest semantic attention, 0.0 = no semantic interest.

Focus on TOP-DOWN attention factors:
- Human faces and eyes (very high weight)
- Text and readable content (high weight)
- Brand logos (high weight)
- Products/objects of interest (medium-high weight)
- High contrast areas (medium weight)
- Novel or unexpected elements (medium-high weight)
- Empty/repetitive areas (low weight)

Return ONLY: {"grid": [[0.2, 0.5, ...], [0.1, 0.8, ...], ...]}
The grid must have exactly 8 rows, each with exactly 10 values.`;

const getSemanticGridFromGemini = async (
    base64: string,
    mimeType: string
): Promise<number[][]> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1500 },
    });
    const result = await model.generateContent([
        { inlineData: { data: base64, mimeType } },
        { text: SEMANTIC_GRID_PROMPT },
    ]);
    const parsed = JSON.parse(result.response.text()) as { grid: number[][] };
    return parsed.grid;
};

const getSemanticGridFromOpenAI = async (
    base64: string,
    mimeType: string
): Promise<number[][]> => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const dataUri = `data:${mimeType};base64,${base64}`;
    const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: dataUri, detail: 'low' } },
                    { type: 'text', text: SEMANTIC_GRID_PROMPT },
                ],
            },
        ],
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || '') as { grid: number[][] };
    return parsed.grid;
};

/**
 * Generates a semantic saliency map by running the LLM multiple times and averaging.
 * This stabilizes the prediction (reduces hallucination variance).
 * Returns a flat Float32Array of size gridRows × gridCols.
 */
const generateSemanticGrid = async (
    base64: string,
    mimeType: string,
    iterations = 3
): Promise<{ grid: number[][]; rows: number; cols: number }> => {
    const GRID_ROWS = 8;
    const GRID_COLS = 10;

    const grids: number[][][] = [];

    const getGrid = hasGemini()
        ? () => getSemanticGridFromGemini(base64, mimeType)
        : () => getSemanticGridFromOpenAI(base64, mimeType);

    for (let i = 0; i < iterations; i++) {
        try {
            const g = await getGrid();
            if (g.length === GRID_ROWS && g[0].length === GRID_COLS) {
                grids.push(g);
            }
        } catch (err) {
            console.warn(`[Semantic Grid] Iteration ${i + 1} failed:`, err instanceof Error ? err.message : err);
        }
    }

    if (grids.length === 0) {
        // Return uniform grid if all iterations failed
        const uniform = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(0.5));
        return { grid: uniform, rows: GRID_ROWS, cols: GRID_COLS };
    }

    // Average grids
    const averaged: number[][] = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(0));
    for (const g of grids) {
        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                averaged[r][c] += g[r][c] / grids.length;
            }
        }
    }

    return { grid: averaged, rows: GRID_ROWS, cols: GRID_COLS };
};

/**
 * Interpolates a low-resolution semantic grid to match TranSalNet output dimensions.
 * Uses bilinear interpolation.
 */
const interpolateGrid = (
    grid: number[][],
    gridRows: number,
    gridCols: number,
    targetW: number,
    targetH: number
): Float32Array => {
    const result = new Float32Array(targetW * targetH);

    for (let row = 0; row < targetH; row++) {
        for (let col = 0; col < targetW; col++) {
            // Map target pixel to grid coordinate
            const gx = (col / targetW) * gridCols;
            const gy = (row / targetH) * gridRows;

            const gx0 = Math.min(Math.floor(gx), gridCols - 1);
            const gx1 = Math.min(gx0 + 1, gridCols - 1);
            const gy0 = Math.min(Math.floor(gy), gridRows - 1);
            const gy1 = Math.min(gy0 + 1, gridRows - 1);

            const fx = gx - gx0;
            const fy = gy - gy0;

            // Bilinear interpolation
            const v00 = grid[gy0][gx0];
            const v10 = grid[gy0][gx1];
            const v01 = grid[gy1][gx0];
            const v11 = grid[gy1][gx1];

            result[row * targetW + col] =
                v00 * (1 - fx) * (1 - fy) +
                v10 * fx * (1 - fy) +
                v01 * (1 - fx) * fy +
                v11 * fx * fy;
        }
    }

    return result;
};

/**
 * Generates a hybrid saliency map: TranSalNet (computational) + LLM (semantic).
 * @param imagePath - Path to the image
 * @param transalnetMap - Raw TranSalNet saliency (384×288 Float32Array, normalized 0-1)
 * @param alpha - Weight for computational map (default 0.65)
 * @param beta - Weight for semantic map (default 0.35)
 * @returns Fused saliency map as heatmap points
 */
export const generateHybridSaliency = async (
    imagePath: string,
    transalnetMap: Float32Array,
    mapWidth: number,
    mapHeight: number,
    alpha = 0.65,
    beta = 0.35
): Promise<Float32Array> => {
    const { base64, mimeType } = await imageToBase64(imagePath);

    console.log('[Hybrid Saliency] Running semantic grid (3 iterations)...');
    const { grid, rows, cols } = await generateSemanticGrid(base64, mimeType, 3);

    // Interpolate semantic grid to match TranSalNet resolution
    const semanticMap = interpolateGrid(grid, rows, cols, mapWidth, mapHeight);

    // Step 3: Fuse: final = α × computational + β × semantic
    const fused = new Float32Array(transalnetMap.length);
    for (let i = 0; i < fused.length; i++) {
        fused[i] = alpha * transalnetMap[i] + beta * semanticMap[i];
    }

    // Step 4: Focal equalization — counteract center bias using semantic map as guide
    const equalized = applyFocalEqualization(fused, semanticMap, mapWidth, mapHeight);

    // Normalize result to [0, 1]
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < equalized.length; i++) {
        if (equalized[i] < min) min = equalized[i];
        if (equalized[i] > max) max = equalized[i];
    }
    const range = max - min;
    if (range > 0) {
        for (let i = 0; i < equalized.length; i++) {
            equalized[i] = (equalized[i] - min) / range;
        }
    }

    // Step 5: Stochastic jitter — break mechanical symmetry for realistic appearance
    const jittered = applyStochasticJitter(equalized, mapWidth, mapHeight, 0.12);

    console.log('[Hybrid Saliency] Fusion + focal equalization + jitter complete (α=%s, β=%s)', alpha, beta);
    return jittered;
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
