/**
 * AI Analysis Service
 * Uses Gemini 2.0 Flash (primary) with GPT-4o fallback to analyze visual
 * attention patterns in images. Receives the original image + TranSalNet
 * saliency data to produce structured UX insights.
 *
 * Gemini Flash is ~30x cheaper than GPT-4o. Falls back to GPT-4o on failure.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { applyFocalEqualization, applyStochasticJitter, applyScanPattern, normalizePercentile, applyManualAoiBoost, boostSemanticGridForManualAois } from './attention-prediction.service';
import OpenAI from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import type { AiAnalysisResult } from './ai-analysis.types';

export interface ManualAoiInput {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// ─── Config ─────────────────────────────────────────────────────────

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

const hasGemini = () => Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

// ─── Shared prompt ──────────────────────────────────────────────────

export const DEFAULT_ATTENTION_PROMPT = `You are an expert in visual attention analysis, UX design, and neuro-design principles (Gestalt, cognitive load, visual hierarchy). You analyze images to predict where users will look, how attention flows, and provide actionable design recommendations.

You combine saliency map data (from a computational model) with your visual analysis expertise to produce structured, precise reports.

Always respond with valid JSON matching the exact schema provided. All coordinate values must be percentages (0-100) relative to the image dimensions. Respond in the SAME LANGUAGE as any text visible in the image (Spanish if Spanish content, English if English, etc.).`;

/** Active system prompt — uses custom if set, default otherwise */
let activeSystemPrompt = DEFAULT_ATTENTION_PROMPT;

const buildUserPrompt = (
    heatmapSummary: string,
    fileName: string,
    profile?: AnalysisProfile,
    manualAois?: ManualAoiInput[],
): string => {
    const profileContext = profile ? buildProfileContext(profile) : '';
    const manualAoiBlock = manualAois?.length ? formatManualAoisForPrompt(manualAois) : '';
    return `Analyze this image for visual attention patterns. The image is from a UX research study file "${fileName}".
${profileContext}
${manualAoiBlock}
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
  "brandAttention": {
    "logos": [
      { "brand": "Brand Name", "x": 10, "y": 5, "width": 15, "height": 8, "saliencyScore": 0.75 }
    ],
    "brandAttentionScore": 65,
    "dominantBrand": "Brand Name",
    "recommendation": "Logo placement is effective but could benefit from more contrast"
  },
  "methodology": "Combined TranSalNet computational saliency with AI visual analysis for context-aware attention prediction."
}

Rules:
- confidence: 0-100, how confident you are in this analysis
- attentionScore: 0-100, how effectively this design captures and guides attention (higher = better design)
- attentionScoreLabel: "Low" (<30), "Medium" (30-59), "High" (60-79), "Very High" (80-100)
- autoAois: 3-8 key areas of interest. x,y = top-left corner, width,height = dimensions, ALL in percentage (0-100)
- attentionLevel: "high" (strong saliency), "medium", "low" (weak but notable)
- gazePath: 5-12 predicted fixation points in chronological viewing order. duration: "brief" (<200ms), "moderate" (200-500ms), "long" (>500ms). Each x,y MUST align with a real visual element or heatmap hotspot (within 8%). Do NOT use generic Z/F-pattern template coordinates.
- gazePathRoutes: EXACTLY 3 distinct viewing strategies. Each with 5-10 fixation points. Routes must visit DIFFERENT regions of this image (not mirror-symmetric paths). Avoid evenly-spaced grid-like coordinates.
- neuroInsights: 3-6 insights based on Gestalt principles, cognitive load, visual hierarchy, contrast, color theory, etc.
- brandAttention: detect ALL brand logos/marks visible in the image. For each, provide bounding box (x,y,width,height in %), saliency score (0-1 = how much attention it gets), brand name. brandAttentionScore (0-100) = overall brand visibility effectiveness. If no logos detected, set logos to empty array and brandAttentionScore to 0.
- leakAreas: areas where attention dissipates or exits the design unintentionally
- flowPath: narrative path of visual attention through the design
- Return ONLY valid JSON, no markdown fences`;
};

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

/**
 * Formats user-defined AOIs for inclusion in the LLM user prompt.
 * @param aois - Manual AOI regions from the researcher
 * @returns Prompt block or empty string
 */
export const formatManualAoisForPrompt = (aois: ManualAoiInput[]): string => {
    if (aois.length === 0) return '';
    const lines = aois.map(
        (a, i) =>
            `  ${i + 1}. "${a.label}" — x=${a.x.toFixed(1)}%, y=${a.y.toFixed(1)}%, ` +
            `width=${a.width.toFixed(1)}%, height=${a.height.toFixed(1)}%`,
    );
    return `
USER-DEFINED AOIs (authoritative — align autoAois to these regions when possible; use the same labels when they match):
${lines.join('\n')}
When manual AOIs are provided, prefer their labels and bounding boxes for autoAois unless the image clearly contradicts them — then explain the discrepancy in the AOI description.
`;
};

/**
 * Parses and validates manual AOI input from request body or stored stimulus.
 * @param raw - Raw AOI array from JSON
 * @returns Normalized manual AOIs (max 20)
 */
export const parseManualAois = (raw: unknown): ManualAoiInput[] => {
    if (!Array.isArray(raw)) return [];
    return raw
        .filter((a): a is Record<string, unknown> => typeof a === 'object' && a !== null)
        .map((a) => ({
            label: String(a.label ?? 'Zone'),
            x: Number(a.x) || 0,
            y: Number(a.y) || 0,
            width: Number(a.width) || 2,
            height: Number(a.height) || 2,
        }))
        .slice(0, 20);
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
        systemInstruction: activeSystemPrompt,
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
            { role: 'system', content: activeSystemPrompt },
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

// ─── Analysis Profile Types ─────────────────────────────────────────

export interface AnalysisProfile {
    /** Target viewer gender */
    gender?: 'male' | 'female' | 'any';
    /** Target viewer age range */
    ageRange?: string; // e.g. "25-35"
    /** Target viewer interests/context */
    interests?: string; // e.g. "luxury fashion, social events"
    /** Stimulus context type — affects scan pattern and β weight */
    context?: 'shelf' | 'web' | 'advertisement' | 'packaging' | 'app' | 'social_media' | 'dashboard' | 'print' | 'general';
    /** Viewer intention */
    intention?: 'utilitarian' | 'emotional' | 'browsing';
    /** Free-form description for maximum flexibility */
    description?: string; // e.g. "Mujer, 30 años, Lima, buscando yogurt light"
}

const buildSemanticGridPrompt = (profile?: AnalysisProfile, manualAois?: ManualAoiInput[]): string => {
    const profileContext = profile ? buildProfileContext(profile) : '';
    const manualBlock = manualAois?.length
        ? `
RESEARCHER-DEFINED PRIORITY ZONES — assign grid weights >= 0.7 to every cell overlapping these regions:
${manualAois.map(
    (a, i) =>
        `  ${i + 1}. "${a.label}" — x=${a.x.toFixed(1)}%, y=${a.y.toFixed(1)}%, ` +
        `width=${a.width.toFixed(1)}%, height=${a.height.toFixed(1)}%`,
).join('\n')}
These zones were marked by the researcher and must receive higher semantic attention than surrounding areas.
`
        : '';

    return `Analyze this image and predict human visual attention based on SEMANTIC content.
${profileContext}${manualBlock}
Return a JSON object with a "grid" property containing a 10x8 2D array (10 columns × 8 rows) of attention weights (0.0 to 1.0).
Each cell represents a region of the image. 1.0 = highest semantic attention, 0.0 = no semantic interest.

Focus on TOP-DOWN attention factors:
- Human faces and eyes (very high weight)
- Text and readable content (high weight)
- Brand logos and product branding (high weight)
- Products/objects of interest (medium-high weight)
- High contrast areas (medium weight)
- Novel or unexpected elements (medium-high weight)
${profile?.context === 'shelf' || profile?.context === 'packaging' ? `- Nutritional claims and certifications (medium-high weight)
- Premium vs basic packaging cues (medium weight)
- Price tags and promotional labels (high weight)
- Brand mascots and characters (high weight)
` : ''}${profile?.context === 'app' ? `- Navigation bars and tab bars (high weight)
- Floating action buttons (high weight)
- Modal/bottom sheet content (very high weight)
- Status bar and system UI (low weight)
` : ''}${profile?.context === 'social_media' ? `- Profile picture and username (high weight)
- Engagement metrics and buttons (medium-high weight)
- Hashtags and mentions (medium weight)
- Autoplay video thumbnail (very high weight)
` : ''}- Empty/repetitive areas (low weight)

Return ONLY: {"grid": [[0.2, 0.5, ...], [0.1, 0.8, ...], ...]}
The grid must have exactly 8 rows, each with exactly 10 values.`;
};

function buildProfileContext(profile: AnalysisProfile): string {
    const parts: string[] = [];

    if (profile.description) {
        parts.push(`TARGET VIEWER: ${profile.description}`);
    } else {
        const demo: string[] = [];
        if (profile.gender && profile.gender !== 'any') demo.push(profile.gender);
        if (profile.ageRange) demo.push(`age ${profile.ageRange}`);
        if (profile.interests) demo.push(`interested in ${profile.interests}`);
        if (demo.length > 0) parts.push(`TARGET VIEWER: ${demo.join(', ')}`);
    }

    if (profile.intention === 'utilitarian') {
        parts.push('INTENTION: Searching for specific information (price, specs, nutrition). Prioritize text, labels, and data.');
    } else if (profile.intention === 'emotional') {
        parts.push('INTENTION: Seeking inspiration/emotion (aesthetics, lifestyle). Prioritize imagery, colors, and mood.');
    }

    const contextPrompts: Record<string, string> = {
        shelf: 'CONTEXT: Supermarket shelf display. Viewer scans left-to-right, top-to-bottom. Eye-level products (rows 3-5) get more attention. Brand differentiation and color standout are key.',
        web: 'CONTEXT: Web page or e-commerce. F-pattern scanning: top-left gets most attention, horizontal sweeps decrease down the page.',
        advertisement: 'CONTEXT: Print or digital advertisement. Z-pattern scanning. Hero image and headline dominate first fixation.',
        packaging: 'CONTEXT: Product packaging close-up. Focus on brand logo, product name, key claims, and visual hierarchy.',
        app: 'CONTEXT: Mobile app screen. Thumb-zone priority: bottom-center most reachable, top corners least. Tab bars, floating action buttons, and modal sheets dominate attention. Vertical scroll bias.',
        social_media: 'CONTEXT: Social media post or feed. Vertical scroll, autoplay bias. Profile picture and name anchor top-left. Image/video dominates center. Engagement buttons (like, comment) at bottom.',
        dashboard: 'CONTEXT: Analytics dashboard or data UI. Users scan for KPI cards first (top row), then charts left-to-right. High data density — color coding and anomalies draw attention.',
        print: 'CONTEXT: Print material (brochure, magazine, poster). Z-pattern or Gutenberg diagonal. Headlines and hero images dominate first fixation. Fine print gets low attention.',
    };
    if (profile.context && contextPrompts[profile.context]) {
        parts.push(contextPrompts[profile.context]);
    }

    if (parts.length === 0) return '';
    return `\nAdjust your attention prediction for the following viewer profile:\n${parts.join('\n')}\n`;
}

/** Get semantic weight (β) based on context. Retail/packaging benefits from higher semantic weight. */
function getSemanticBeta(profile?: AnalysisProfile): number {
    if (!profile?.context) return 0.35;
    const betas: Record<string, number> = {
        shelf: 0.50,
        packaging: 0.50,
        advertisement: 0.45,
        app: 0.45,
        social_media: 0.42,
        web: 0.40,
        dashboard: 0.40,
        print: 0.42,
    };
    return betas[profile.context] ?? 0.35;
}

const getSemanticGridFromGemini = async (
    base64: string,
    mimeType: string,
    profile?: AnalysisProfile,
    manualAois?: ManualAoiInput[],
): Promise<number[][]> => {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || '';
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1500 },
    });
    const prompt = buildSemanticGridPrompt(profile, manualAois);
    const result = await model.generateContent([
        { inlineData: { data: base64, mimeType } },
        { text: prompt },
    ]);
    const parsed = JSON.parse(result.response.text()) as { grid: number[][] };
    return parsed.grid;
};

const getSemanticGridFromOpenAI = async (
    base64: string,
    mimeType: string,
    profile?: AnalysisProfile,
    manualAois?: ManualAoiInput[],
): Promise<number[][]> => {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });
    const dataUri = `data:${mimeType};base64,${base64}`;
    const prompt = buildSemanticGridPrompt(profile, manualAois);
    const response = await client.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'image_url', image_url: { url: dataUri, detail: 'low' } },
                    { type: 'text', text: prompt },
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
    iterations = 3,
    profile?: AnalysisProfile,
    manualAois?: ManualAoiInput[],
): Promise<{ grid: number[][]; rows: number; cols: number }> => {
    const GRID_ROWS = 8;
    const GRID_COLS = 10;

    const grids: number[][][] = [];

    const getGrid = hasGemini()
        ? () => getSemanticGridFromGemini(base64, mimeType, profile, manualAois)
        : () => getSemanticGridFromOpenAI(base64, mimeType, profile, manualAois);

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
    profile?: AnalysisProfile,
    manualAois?: ManualAoiInput[],
): Promise<Float32Array> => {
    const beta = getSemanticBeta(profile);
    const alpha = 1.0 - beta;

    const { base64, mimeType } = await imageToBase64(imagePath);

    const aoiCount = manualAois?.length ?? 0;
    console.log(`[Hybrid Saliency] Running semantic grid (3 iterations, profile: ${profile?.context || 'general'}, β=${beta}, manual AOIs=${aoiCount})...`);
    const { grid: semanticGrid, rows, cols } = await generateSemanticGrid(base64, mimeType, 3, profile, manualAois);

    // ViT-inspired bottom-up attention grid (Dahou 2023: "ViTs are inherent saliency learners")
    // Use 1 iteration with a feature-integration-theory prompt as lightweight ensemble
    let grid: number[][];
    try {
        const { grid: vitGrid } = await generateSemanticGrid(base64, mimeType, 1, {
            description: 'Analyze ONLY bottom-up visual features: color contrast, edge density, texture uniqueness, spatial frequency. Ignore semantic meaning. High weight = high visual pop-out.',
            context: 'general',
        });
        // Ensemble: 70% semantic + 30% bottom-up (feature integration)
        grid = semanticGrid.map((row, r) =>
            row.map((val, c) => val * 0.7 + (vitGrid[r]?.[c] ?? 0.5) * 0.3)
        );
        console.log('[Hybrid Saliency] ViT-inspired ensemble applied (70% semantic + 30% bottom-up)');
    } catch {
        grid = semanticGrid;
    }

    if (manualAois && manualAois.length > 0) {
        grid = boostSemanticGridForManualAois(grid, rows, cols, manualAois);
        console.log(`[Hybrid Saliency] Manual AOI grid boost applied (${manualAois.length} zones)`);
    }

    // Interpolate semantic grid to match TranSalNet resolution
    const semanticMap = interpolateGrid(grid, rows, cols, mapWidth, mapHeight);

    // Step 3: Fuse: final = α × computational + β × semantic
    const fused = new Float32Array(transalnetMap.length);
    for (let i = 0; i < fused.length; i++) {
        fused[i] = alpha * transalnetMap[i] + beta * semanticMap[i];
    }

    // Step 4: Focal equalization — counteract center bias using semantic map as guide
    const equalized = applyFocalEqualization(fused, semanticMap, mapWidth, mapHeight);

    // Step 5: Context-aware scan pattern — applies reading/scanning behavior
    const scanned = applyScanPattern(equalized, mapWidth, mapHeight, profile?.context);

    // Step 6: Percentile normalization — sharper cold/hot separation for granular heatmaps
    const normalized = normalizePercentile(scanned, 88);

    // Step 7: Stochastic jitter — break mechanical symmetry for realistic appearance
    const jittered = applyStochasticJitter(normalized, mapWidth, mapHeight, 0.08);

    // Step 8: Manual AOI spatial boost + re-normalize
    const boosted = manualAois && manualAois.length > 0
        ? applyManualAoiBoost(jittered, mapWidth, mapHeight, manualAois)
        : jittered;
    const finalMap = manualAois && manualAois.length > 0
        ? normalizePercentile(boosted, 88)
        : jittered;

    console.log(`[Hybrid Saliency] Pipeline complete: fusion → equalization → scan(${profile?.context || 'none'}) → percentile norm → jitter → manual AOI boost (α=${alpha}, β=${beta})`);
    return finalMap;
};

const MIN_AUTO_AOI_PCT = 2;

/**
 * Clamps LLM auto-AOI coordinates to valid percentage bounds.
 * @param aoi - Raw auto-AOI from model output
 * @returns Sanitized AOI with lowConfidence when bbox is unreliable
 */
const sanitizeAutoAoi = (
    aoi: AiAnalysisResult['autoAois'][number],
): AiAnalysisResult['autoAois'][number] => {
    const clamp = (n: number): number => {
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, Math.min(100, n));
    };
    const width = Math.max(MIN_AUTO_AOI_PCT, Math.min(100, clamp(Number(aoi.width))));
    const height = Math.max(MIN_AUTO_AOI_PCT, Math.min(100, clamp(Number(aoi.height))));
    const x = Math.max(0, Math.min(100 - width, clamp(Number(aoi.x))));
    const y = Math.max(0, Math.min(100 - height, clamp(Number(aoi.y))));
    const area = width * height;
    const lowConfidence = area < 36 || width < 3 || height < 3;

    return {
        ...aoi,
        label: String(aoi.label || 'Zona sin nombre').slice(0, 80),
        x,
        y,
        width,
        height,
        lowConfidence,
    };
};

/**
 * Sanitizes all auto-AOIs on an AI analysis result before persistence.
 * @param result - Parsed LLM analysis
 * @returns Result with clamped auto-AOI bounds
 */
const GAZE_SNAP_RADIUS_PCT = 14;
const GAZE_SNAP_BLEND = 0.72;
const GOLDEN_RATIO_CONJUGATE = 0.618033988749895;

type GazeFixation = AiAnalysisResult['gazePath'][number];

/**
 * Clamps a percentage coordinate to valid range.
 * @param value - Raw coordinate
 * @returns Clamped percentage
 */
const clampGazePercent = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
};

/**
 * Returns deterministic jitter to break symmetric LLM gaze coordinates.
 * @param order - Fixation order
 * @returns X/Y offset in percentage points
 */
const deterministicGazeJitter = (order: number): { dx: number; dy: number } => {
    const seed = order * GOLDEN_RATIO_CONJUGATE;
    return {
        dx: Math.sin(seed * 11.3) * 2.2,
        dy: Math.cos(seed * 7.7) * 2.2,
    };
};

/**
 * Finds nearest salient heatmap point within snap radius.
 * @param x - Fixation X percent
 * @param y - Fixation Y percent
 * @param heatmapData - Heatmap points
 * @returns Nearest hotspot or null
 */
const findNearestHeatmapHotspot = (
    x: number,
    y: number,
    heatmapData: Array<{ x: number; y: number; value: number }>,
): { x: number; y: number; value: number } | null => {
    let best: { x: number; y: number; value: number } | null = null;
    let bestScore = -Infinity;

    for (const point of heatmapData) {
        const dist = Math.hypot(point.x - x, point.y - y);
        if (dist > GAZE_SNAP_RADIUS_PCT) continue;
        const proximity = 1 - dist / GAZE_SNAP_RADIUS_PCT;
        const score = point.value * 0.7 + proximity * 0.3;
        if (score > bestScore) {
            bestScore = score;
            best = point;
        }
    }

    return best;
};

/**
 * Snaps gaze fixations to heatmap hotspots with light jitter.
 * @param fixations - LLM gaze path
 * @param heatmapData - TranSalNet heatmap
 * @returns Anchored fixations
 */
const anchorGazePathToHeatmap = (
    fixations: GazeFixation[],
    heatmapData: Array<{ x: number; y: number; value: number }>,
): GazeFixation[] => {
    if (!fixations.length) return fixations;

    return fixations.map((fix) => {
        const hotspot = heatmapData.length > 0
            ? findNearestHeatmapHotspot(fix.x, fix.y, heatmapData)
            : null;

        if (hotspot) {
            const jitter = deterministicGazeJitter(fix.order);
            return {
                ...fix,
                x: clampGazePercent(
                    hotspot.x * GAZE_SNAP_BLEND + fix.x * (1 - GAZE_SNAP_BLEND) + jitter.dx * 0.35,
                ),
                y: clampGazePercent(
                    hotspot.y * GAZE_SNAP_BLEND + fix.y * (1 - GAZE_SNAP_BLEND) + jitter.dy * 0.35,
                ),
            };
        }

        const jitter = deterministicGazeJitter(fix.order);
        return {
            ...fix,
            x: clampGazePercent(fix.x + jitter.dx),
            y: clampGazePercent(fix.y + jitter.dy),
        };
    });
};

const sanitizeAiAnalysisResult = (
    result: AiAnalysisResult,
    heatmapData: Array<{ x: number; y: number; value: number }> = [],
): AiAnalysisResult => {
    const autoAois = Array.isArray(result.autoAois)
        ? result.autoAois.map(sanitizeAutoAoi)
        : [];

    const gazePath = Array.isArray(result.gazePath)
        ? anchorGazePathToHeatmap(result.gazePath, heatmapData)
        : [];

    const gazePathRoutes = Array.isArray(result.gazePathRoutes)
        ? result.gazePathRoutes.map((route) => ({
            ...route,
            fixations: anchorGazePathToHeatmap(route.fixations ?? [], heatmapData),
        }))
        : result.gazePathRoutes;

    return { ...result, autoAois, gazePath, gazePathRoutes };
};

// ─── Public API ─────────────────────────────────────────────────────

export const analyzeAttentionWithAI = async (
    imagePath: string,
    heatmapData: Array<{ x: number; y: number; value: number }>,
    fileName: string,
    profile?: AnalysisProfile,
    customPrompt?: string,
    manualAois?: ManualAoiInput[],
): Promise<AiAnalysisResult> => {
    if (!hasGemini() && !hasOpenAI()) {
        throw new Error('No AI API key configured (GEMINI_API_KEY or OPENAI_API_KEY)');
    }

    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found: ${imagePath}`);
    }

    // Set active prompt for this analysis run
    activeSystemPrompt = (customPrompt && customPrompt.trim()) || DEFAULT_ATTENTION_PROMPT;

    const { base64, mimeType } = await imageToBase64(imagePath);
    const heatmapSummary = summarizeHeatmap(heatmapData);
    const userPrompt = buildUserPrompt(heatmapSummary, fileName, profile, manualAois);

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

    const sanitized = sanitizeAiAnalysisResult(result, heatmapData);
    sanitized.analyzedAt = new Date().toISOString();

    console.log(
        `[AI Analysis] Complete: score=${sanitized.attentionScore}, ` +
        `aois=${sanitized.autoAois?.length || 0}, gazePath=${sanitized.gazePath?.length || 0}`
    );

    return sanitized;
};
