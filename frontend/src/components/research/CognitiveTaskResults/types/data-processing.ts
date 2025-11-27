/**
 * Tipos para procesamiento de datos en CognitiveTaskResults
 */

export interface ProcessedDataItem {
  questionId?: string;
  questionKey?: string;
  totalResponses?: number;
  sentimentData?: {
    responses: Array<{
      text: string;
      participantId: string;
      timestamp: string;
    }>;
    totalResponses: number;
  };
  choiceData?: {
    choices: Array<{
      id?: string;
      label: string;
      count: number;
      percentage: number;
    }>;
    totalResponses: number;
  };
  rankingData?: {
    responses: Array<{
      participantId: string;
      ranking: unknown;
      timestamp: string;
    }>;
    totalResponses: number;
  };
  linearScaleData?: {
    values?: number[];
    responses?: Array<{ value: number; count: number }>;
    distribution?: Record<number, number>;
    scaleRange?: { start: number; end: number };
    average: number;
    totalResponses: number;
  };
  preferenceTestData?: {
    preferences: Array<{
      option: string;
      count: number;
      percentage: number;
    }>;
    totalResponses: number;
  };
  navigationFlowData?: {
    responses: Array<{
      participantId: string;
      data: unknown;
      value?: unknown;
      timestamp: string;
    }>;
    totalResponses: number;
  };
  ratingData?: unknown;
  imageSelectionData?: unknown;
}

export interface QuestionFile {
  id?: string;
  name?: string;
  url?: string;
  preview?: string;
  path?: string;
  src?: string;
  s3Key?: string;
  s3Url?: string;
  fileName?: string;
  hitZones?: Array<unknown>;
  hitzones?: Array<unknown>;
}

export interface ResearchConfigQuestionWithFiles {
  id: string;
  type: string;
  title: string;
  description?: string;
  required?: boolean;
  showConditionally?: boolean;
  choices?: Array<{
    id: string;
    text: string;
    label?: string;
    isQualify?: boolean;
    isDisqualify?: boolean;
  }>;
  scaleConfig?: {
    startValue?: number;
    endValue?: number;
  };
  files?: Array<QuestionFile | string>;
  instructions?: string;
  instruction?: string;
  [key: string]: unknown;
}

export interface NavigationFlowResponseValue {
  imageSelections?: Record<string, {
    hitzoneId?: string;
    click?: {
      x: number;
      y: number;
      hitzoneWidth?: number;
      hitzoneHeight?: number;
    };
  }> | string;
  clickPosition?: {
    x: number;
    y: number;
    hitzoneWidth?: number;
    hitzoneHeight?: number;
  } | string;
  selectedImageIndex?: number;
  selectedHitzone?: string;
  hitzoneId?: string;
  hitzoneWidth?: number;
  hitzoneHeight?: number;
  allClicksTracking?: Array<{
    x?: number;
    y?: number;
    timestamp?: number;
    isCorrectHitzone?: boolean;
    imageIndex?: number;
  }> | string;
  visualClickPoints?: Array<{
    x?: number;
    y?: number;
    timestamp?: number;
    isCorrect?: boolean;
    imageIndex?: number;
  }> | Record<string, Array<{
    x: number;
    y: number;
    timestamp: number;
    isCorrect?: boolean;
    imageIndex?: number;
  }>> | string;
  [key: string]: unknown;
}

export interface ParsedClick {
  x: number;
  y: number;
  timestamp: number;
  isCorrect: boolean;
  imageIndex: number;
}

export interface ClickPosition {
  x: number;
  y: number;
  hitzoneWidth?: number;
  hitzoneHeight?: number;
}

export interface ImageSelection {
  hitzoneId: string;
  click: {
    x: number;
    y: number;
    hitzoneWidth: number;
    hitzoneHeight: number;
  };
}

