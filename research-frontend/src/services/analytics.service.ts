/**
 * Analytics Service
 * Fetches aggregated response data for research results visualization
 */

import apiClient from './api/client';

// ==========================================
// COGNITIVE TASK RESULTS
// ==========================================

export interface CognitiveTaskResults {
    modules: Array<{
        moduleId: string;
        moduleName: string;
        description: string;
        totalResponses: number;
        responses: any[];
    }>;
}

export const getCognitiveTaskResults = async (researchId: string): Promise<CognitiveTaskResults> => {
    const response = await apiClient.get<{ results: CognitiveTaskResults }>(
        `/analytics/research/${researchId}/cognitive-tasks`
    );
    return response.results;
};

// ==========================================
// NAVIGATION FLOW RESULTS
// ==========================================

export interface NavigationFlowResults {
    totalResponses: number;
    completedFlows: number;
    completionRate: number;
    totalClicks: number;
    correctClicks: number;
    accuracy: number;
    averageDuration: number;
    heatmapData: Array<{
        x: number;
        y: number;
        timestamp: number;
        isCorrect: boolean;
    }>;
    responses: any[];
}

export const getNavigationFlowResults = async (
    researchId: string,
    moduleId: string
): Promise<NavigationFlowResults> => {
    const response = await apiClient.get<{ results: NavigationFlowResults }>(
        `/analytics/research/${researchId}/navigation-flow/${moduleId}`
    );
    return response.results;
};

// ==========================================
// PREFERENCE TEST RESULTS
// ==========================================

export interface PreferenceTestResults {
    totalResponses: number;
    selections: Array<{
        imageId: number;
        count: number;
        percentage: number;
    }>;
    averageViewTime: number;
    responses: any[];
}

export const getPreferenceTestResults = async (
    researchId: string,
    moduleId: string
): Promise<PreferenceTestResults> => {
    const response = await apiClient.get<{ results: PreferenceTestResults }>(
        `/analytics/research/${researchId}/preference-test/${moduleId}`
    );
    return response.results;
};

// ==========================================
// TEXT RESPONSES
// ==========================================

export interface TextResponses {
    totalResponses: number;
    responses: Array<{
        participantId: string;
        text: string;
        metadata: any;
        createdAt: string;
    }>;
}

export const getTextResponses = async (
    researchId: string,
    moduleId: string
): Promise<TextResponses> => {
    const response = await apiClient.get<{ results: TextResponses }>(
        `/analytics/research/${researchId}/text-responses/${moduleId}`
    );
    return response.results;
};

// ==========================================
// CHOICE RESPONSES
// ==========================================

export interface ChoiceResponses {
    totalResponses: number;
    choiceCounts: Array<{
        choice: string;
        count: number;
        percentage: number;
    }>;
    responses: any[];
}

export const getChoiceResponses = async (
    researchId: string,
    moduleId: string
): Promise<ChoiceResponses> => {
    const response = await apiClient.get<{ results: ChoiceResponses }>(
        `/analytics/research/${researchId}/choice-responses/${moduleId}`
    );
    return response.results;
};

// ==========================================
// SCALE RESPONSES
// ==========================================

export interface ScaleResponses {
    totalResponses: number;
    average: number;
    distribution: Array<{
        value: number;
        count: number;
        percentage: number;
    }>;
    responses: any[];
}

export const getScaleResponses = async (
    researchId: string,
    moduleId: string
): Promise<ScaleResponses> => {
    const response = await apiClient.get<{ results: ScaleResponses }>(
        `/analytics/research/${researchId}/scale-responses/${moduleId}`
    );
    return response.results;
};

// ==========================================
// RANKING RESPONSES
// ==========================================

export interface RankingResponses {
    totalResponses: number;
    rankings: Array<{
        item: string;
        meanPosition: number;
        count: number;
    }>;
    responses: any[];
}

export const getRankingResponses = async (
    researchId: string,
    moduleId: string
): Promise<RankingResponses> => {
    const response = await apiClient.get<{ results: RankingResponses }>(
        `/analytics/research/${researchId}/ranking-responses/${moduleId}`
    );
    return response.results;
};

// ==========================================
// SMARTVOC RESULTS
// ==========================================

export interface SmartVOCResults {
    totalResponses: number;
    uniqueParticipants: number;
    metrics: {
        cpvValue: number;
        satisfaction: number;
        retention: number;
        npsScore: number;
        promoters: number;
        neutrals: number;
        detractors: number;
        csatScores: number[];
        cesScores: number[];
        cvScores: number[];
        impact: string;
        trend: string;
    };
    timeSeriesData: Array<{
        date: string;
        score: number;
        nps: number;
        nev: number;
        count: number;
    }>;
    vocResponses: Array<{
        text: string;
        sentiment?: string;
        participantId: string;
        createdAt: string;
    }>;
    monthlyNPSData: Array<{
        month: string;
        promoters: number;
        neutrals: number;
        detractors: number;
        npsRatio: number;
        date?: string;
    }>;
    emotionalStates: Record<string, number>;
}

export const getSmartVOCResults = async (researchId: string): Promise<SmartVOCResults> => {
    const response = await apiClient.get<{ results: SmartVOCResults }>(
        `/analytics/research/${researchId}/smartvoc`
    );
    return response.results;
};
