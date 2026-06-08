export const DEFAULT_ATTENTION_CRITERIA = `You are an expert in visual attention analysis, UX design, and neuro-design principles (Gestalt, cognitive load, visual hierarchy). You analyze images to predict where users will look, how attention flows, and provide actionable design recommendations.

You combine saliency map data (from a computational model) with your visual analysis expertise to produce structured, precise reports.

Always respond with valid JSON matching the exact schema provided. All coordinate values must be percentages (0-100) relative to the image dimensions. Respond in the SAME LANGUAGE as any text visible in the image (Spanish if Spanish content, English if English, etc.).`;

export const RECOMMENDED_CRITERIA_TEMPLATE = `## Rol
Eres un experto en análisis de atención visual, diseño UX y neurodesign (Gestalt, carga cognitiva, jerarquía visual).

## Contexto del estímulo
[Tipo: packaging / web / shelf / publicidad / otro]
[Descripción breve del material y objetivo del estudio]

## Zonas definidas por el investigador
Las AOIs marcadas manualmente son la referencia principal para ubicar autoAois y el flujo de atención.

## Preguntas a responder
1. ¿Qué elementos capturan la atención primero?
2. ¿El flujo visual guía hacia el mensaje clave?
3. ¿Hay áreas de fuga de atención?
4. [Agregar preguntas específicas del estudio]

## Formato de salida
Responde SOLO con JSON válido según el schema del sistema.
Coordenadas en porcentaje (0-100) relativas a las dimensiones de la imagen.

## Idioma
Responde en el mismo idioma que el texto visible en la imagen.`;

export const CRITERIA_PRESETS_KEY = 'emotiox-criteria-presets';
export const LEGACY_PROMPT_PRESETS_KEY = 'emotiox-prompt-presets';

export const DEFAULT_CRITERIA_LABEL = 'Default';
export const CUSTOM_CRITERIA_LABEL = 'Personalizado';

export interface CriteriaPreset {
    name: string;
    prompt: string;
}

/**
 * Finds a preset name that exactly matches the given criteria text.
 * @param prompt - Criteria body text
 * @param presets - Available named presets
 * @returns Preset name or null when no exact match exists
 */
export function matchCriteriaPresetName(
    prompt: string,
    presets: CriteriaPreset[],
): string | null {
    const normalized = prompt.trim();
    const match = presets.find((preset) => preset.prompt.trim() === normalized);
    return match?.name ?? null;
}

/**
 * Resolves the display label for the active analysis criteria.
 * @param savedName - Persisted criteria name from research settings
 * @param savedPrompt - Persisted criteria body from research settings
 * @param presets - Available named presets
 * @returns Human-readable criteria label for the header
 */
/**
 * Returns true when a non-default analysis criteria is saved on the study.
 * @param savedName - Persisted criteria name from research settings
 * @param savedPrompt - Persisted criteria body from research settings
 * @returns Whether step 2 of the AOI-first workflow is complete
 */
export function isAttentionCriteriaConfigured(
    savedName: string | undefined,
    savedPrompt: string | undefined,
): boolean {
    if (savedName?.trim() && savedName.trim() !== DEFAULT_CRITERIA_LABEL) {
        return true;
    }
    const prompt = savedPrompt?.trim() ?? '';
    return prompt.length > 0 && prompt !== DEFAULT_ATTENTION_CRITERIA.trim();
}

export function resolveAttentionCriteriaLabel(
    savedName: string | undefined,
    savedPrompt: string | undefined,
    presets: CriteriaPreset[],
): string {
    const prompt = savedPrompt?.trim() ?? '';
    if (!prompt || prompt === DEFAULT_ATTENTION_CRITERIA.trim()) {
        return DEFAULT_CRITERIA_LABEL;
    }
    if (savedName?.trim()) {
        return savedName.trim();
    }
    return matchCriteriaPresetName(prompt, presets) ?? CUSTOM_CRITERIA_LABEL;
}

export const DEFAULT_CRITERIA_PRESETS: CriteriaPreset[] = [
    {
        name: 'Packaging / Shelf',
        prompt: `${RECOMMENDED_CRITERIA_TEMPLATE}\n\n## Enfoque adicional\nPrioriza logo, claims, jerarquía en anaquel y diferenciación vs competencia.`,
    },
    {
        name: 'Landing / Web',
        prompt: `${RECOMMENDED_CRITERIA_TEMPLATE}\n\n## Enfoque adicional\nEvalúa F-pattern, CTA, leak areas y jerarquía above the fold.`,
    },
    {
        name: 'Social / Ad',
        prompt: `${RECOMMENDED_CRITERIA_TEMPLATE}\n\n## Enfoque adicional\nEvalúa Z-pattern, hero visual, texto overlay y puntos de salida de atención.`,
    },
    {
        name: 'UX Data Visualization',
        prompt: `${RECOMMENDED_CRITERIA_TEMPLATE}\n\n## Enfoque adicional\nEvalúa dashboards, visualizaciones de datos, legibilidad de KPIs, jerarquía de métricas y contraste entre bloques de texto.`,
    },
];

/**
 * Adds missing built-in presets to a stored preset list without overwriting custom entries.
 * @param stored - Presets loaded from localStorage
 * @returns Presets merged with DEFAULT_CRITERIA_PRESETS
 */
export function mergeDefaultCriteriaPresets(stored: CriteriaPreset[]): CriteriaPreset[] {
    const merged = [...stored];
    for (const preset of DEFAULT_CRITERIA_PRESETS) {
        if (!merged.some((item) => item.name === preset.name)) {
            merged.push(preset);
        }
    }
    return merged;
}

/**
 * Derives the criteria name to persist when applying a draft to the study.
 * @param promptDraft - Criteria body in the editor
 * @param draftName - Explicitly selected preset name, if any
 * @param presets - Available named presets
 * @returns Name to store in settings, or empty string for default criteria
 */
export function resolveCriteriaNameForSave(
    promptDraft: string,
    draftName: string | undefined,
    presets: CriteriaPreset[],
): string {
    const normalized = promptDraft.trim();
    if (!normalized || normalized === DEFAULT_ATTENTION_CRITERIA.trim()) {
        return '';
    }
    if (draftName?.trim() && draftName.trim() !== CUSTOM_CRITERIA_LABEL) {
        return draftName.trim();
    }
    return matchCriteriaPresetName(normalized, presets) ?? CUSTOM_CRITERIA_LABEL;
}
