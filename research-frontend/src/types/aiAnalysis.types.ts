/**
 * AI Analysis Types
 * Structured output from GPT-4o Vision analysis of visual attention.
 * Mirror of backend/src/modules/attention-prediction/ai-analysis.types.ts
 */

export interface AiAnalysisResult {
    context: {
        type: string;
        description: string;
    };
    confidence: number;
    attentionScore: number;
    attentionScoreLabel: string;
    autoAois: Array<{
        label: string;
        x: number;
        y: number;
        width: number;
        height: number;
        attentionLevel: string;
        description: string;
    }>;
    attentionFlow: {
        entryPoint: string;
        exitPoint: string;
        leakAreas: string[];
        flowPath: string[];
        summary: string;
    };
    gazePath: Array<{
        order: number;
        x: number;
        y: number;
        label: string;
        duration: string;
    }>;
    gazePathRoutes?: Array<{
        id: string;
        name: string;
        description: string;
        fixations: Array<{
            order: number;
            x: number;
            y: number;
            label: string;
            duration: string;
        }>;
    }>;
    neuroInsights: Array<{
        principle: string;
        finding: string;
        recommendation: string;
    }>;
    methodology: string;
    analyzedAt: string;
}
