/**
 * Analytics Service
 * Fetches aggregated response data for research results visualization
 */

import apiClient from './api/client';

// ==========================================
// SHARED TYPES
// ==========================================

export interface BaseResponse {
    participantId: string;
    createdAt: string;
    [key: string]: unknown;
}

export interface ResponseMetadata {
    duration?: number;
    deviceType?: string;
    browserInfo?: string;
    [key: string]: unknown;
}

// ==========================================
// COGNITIVE TASK RESULTS
// ==========================================

export interface CognitiveTaskResponse extends BaseResponse {
    moduleId: string;
    responseData: Record<string, unknown>;
}

export interface CognitiveTaskResults {
    modules: Array<{
        moduleId: string;
        moduleName: string;
        description: string;
        totalResponses: number;
        responses: CognitiveTaskResponse[];
    }>;
}

export const getCognitiveTaskResults = async (researchId: string): Promise<CognitiveTaskResults> => {
    const response = await apiClient.get<{ results: CognitiveTaskResults }>(
        `/analytics/research/${researchId}/cognitive-tasks`
    );
    return response.results;
};

export interface DemographicParticipant {
    participantId: string;
    demographics: Record<string, string>;
}

export interface DemographicResponsesResult {
    participants: DemographicParticipant[];
    demographicTypes: string[];
}

export const getDemographicResponses = async (researchId: string): Promise<DemographicResponsesResult> => {
    const response = await apiClient.get<{ results: DemographicResponsesResult }>(
        `/analytics/research/${researchId}/demographics`
    );
    return response.results;
};

// ==========================================
// NAVIGATION FLOW RESULTS
// ==========================================

export interface NavigationFlowResponse extends BaseResponse {
    moduleId: string;
    completedFlow: boolean;
    clicks: number;
    correctClicks: number;
    accuracy: number;
    duration: number;
    heatmapData: Array<{
        x: number;
        y: number;
        timestamp: number;
        isCorrect: boolean;
        imageId?: string;
    }>;
    metadata?: ResponseMetadata;
}

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
        imageId?: string;
    }>;
    responses: NavigationFlowResponse[];
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

export interface PreferenceTestResponse extends BaseResponse {
    moduleId: string;
    selectedImageId: number;
    viewTime: number;
    metadata?: ResponseMetadata;
}

export interface PreferenceTestResults {
    totalResponses: number;
    selections: Array<{
        imageId: number;
        count: number;
        percentage: number;
    }>;
    averageViewTime: number;
    responses: PreferenceTestResponse[];
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

export interface TextResponse extends BaseResponse {
    moduleId: string;
    text: string;
    metadata?: ResponseMetadata;
}

export interface TextResponses {
    totalResponses: number;
    responses: TextResponse[];
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

export interface ChoiceResponse extends BaseResponse {
    moduleId: string;
    choice: string;
    metadata?: ResponseMetadata;
}

export interface ChoiceResponses {
    totalResponses: number;
    choiceCounts: Array<{
        choice: string;
        count: number;
        percentage: number;
    }>;
    responses: ChoiceResponse[];
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

export interface ScaleResponse extends BaseResponse {
    moduleId: string;
    value: number;
    metadata?: ResponseMetadata;
}

export interface ScaleResponses {
    totalResponses: number;
    average: number;
    distribution: Array<{
        value: number;
        count: number;
        percentage: number;
    }>;
    responses: ScaleResponse[];
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

export interface RankingResponse extends BaseResponse {
    moduleId: string;
    rankings: Array<{
        item: string;
        position: number;
    }>;
    metadata?: ResponseMetadata;
}

export interface RankingResponses {
    totalResponses: number;
    rankings: Array<{
        item: string;
        label?: string;
        meanPosition: number;
        count: number;
    }>;
    responses: RankingResponse[];
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
        csatScores: Array<{ value: number; date: string; participantId?: string }>;
        cesScores: Array<{ value: number; date: string; participantId?: string }>;
        cvScores: Array<{ value: number; date: string; participantId?: string }>;
        npsScores: Array<{ value: number; date: string; participantId?: string }>;
        impact: string;
        trend: string;
    };
    timeSeriesData: Array<{
        date: string;
        nps: number;
        nev: number;
        csat: number;
        ces: number;
        cv: number;
        cpv: number;
        count: number;
    }>;
    intradayTimeSeriesData: Array<{
        date: string;
        label: string;
        nps: number;
        nev: number;
        csat: number;
        ces: number;
        cv: number;
        cpv: number;
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
    monthlyMetricsData: Array<{
        month: string;
        date: string;
        csatSatisfied: number;
        csatDissatisfied: number;
        cesPositive: number;
        cesNegative: number;
        cvPositive: number;
        cvNegative: number;
        cpv: number;
    }>;
    emotionalStates: Record<string, number>;
    nevResponsesData: Array<{ emotions: string[]; date: string; participantId?: string }>;
}

export const getSmartVOCResults = async (researchId: string): Promise<SmartVOCResults> => {
    const response = await apiClient.get<{ results: SmartVOCResults }>(
        `/analytics/research/${researchId}/smartvoc`
    );
    return response.results;
};
