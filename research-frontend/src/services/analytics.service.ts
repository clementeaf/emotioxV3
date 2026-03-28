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
    questionText?: string;
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
    questionText?: string;
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
    questionText?: string;
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
// SCREENER RESULTS
// ==========================================

export interface ScreenerChoiceDistribution {
    choiceId: string;
    label: string;
    eligibility: 'Qualify' | 'Disqualify';
    count: number;
    percentage: number;
}

export interface ScreenerDayInfo {
    date: string;
    dayName: string;
    hour: string;
    count: number;
    percentage: number;
}

export interface ScreenerResults {
    totalResponses: number;
    qualified: number;
    disqualified: number;
    overquota: number;
    questionText: string;
    choiceDistribution: ScreenerChoiceDistribution[];
    dailyDistribution: Array<{
        date: string;
        count: number;
        byChoice: Record<string, number>;
    }>;
    bestDay: ScreenerDayInfo | null;
    slowestDay: ScreenerDayInfo | null;
    weeklyTimeSeries: Array<{
        date: string;
        dayName: string;
        count: number;
    }>;
}

export const getScreenerResults = async (researchId: string): Promise<ScreenerResults> => {
    const response = await apiClient.get<{ results: ScreenerResults }>(
        `/analytics/research/${researchId}/screener`
    );
    return response.results;
};

// ==========================================
// IMPLICIT ASSOCIATION RESULTS
// ==========================================

export interface IATTarget {
    id: string;
    name: string;
    imageUrl?: string;
}

export interface IATAttribute {
    id: string;
    label: string;
    imageUrl?: string;
}

export interface IATModuleResult {
    moduleId: string;
    moduleName: string;
    testType: 'attribute_testing' | 'comparing_attribute' | 'objects_comparing';
    primingTime: number;
    targets: IATTarget[];
    attributes: IATAttribute[];
    totalResponses: number;
    scores: Array<{
        attributeId: string;
        attributeLabel: string;
        targetScores: Record<string, number>;
    }>;
}

export interface ImplicitAssociationResults {
    modules: IATModuleResult[];
}

export const getImplicitAssociationResults = async (researchId: string): Promise<ImplicitAssociationResults> => {
    const response = await apiClient.get<{ results: ImplicitAssociationResults }>(
        `/analytics/research/${researchId}/implicit-association`
    );
    return response.results;
};

// ==========================================
// EYE TRACKING RESULTS
// ==========================================

export interface EyeTrackingAOI {
    id: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    dwellTimePercent: number;
    fixationCount: number;
    avgDuration: number;
    participantCount: number;
}

export interface EyeTrackingParticipant {
    participantId: string;
    calibrationQuality: string;
    integrityScore: string;
    totalFixations: number;
    totalDwellTime: number;
}

export interface EyeTrackingStimulus {
    moduleId: string;
    moduleName: string;
    stimulusUrl: string;
    modality: 'stand_alone' | 'shelf';
    taskDescription: string;
    totalResponses: number;
    uniqueParticipants: number;
    avgDwellTime: number;
    avgFixationCount: number;
    heatmapData: Array<{ x: number; y: number; duration: number }>;
    fixations: Array<{ x: number; y: number; duration: number; participantId: string; timestamp: number }>;
    aois: EyeTrackingAOI[];
    participants: EyeTrackingParticipant[];
}

export interface EyeTrackingResults {
    stimuli: EyeTrackingStimulus[];
}

export const getEyeTrackingResults = async (researchId: string): Promise<EyeTrackingResults> => {
    const response = await apiClient.get<{ results: EyeTrackingResults }>(
        `/analytics/research/${researchId}/eye-tracking`
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
    questionTexts?: Record<string, string>;
}

export const getSmartVOCResults = async (researchId: string): Promise<SmartVOCResults> => {
    const response = await apiClient.get<{ results: SmartVOCResults }>(
        `/analytics/research/${researchId}/smartvoc`
    );
    return response.results;
};
