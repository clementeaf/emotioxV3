/**
 * NavigationFlow types - Updated to match real data structure
 */

export interface NavigationFlowResultsProps {
  researchId: string;
  data?: NavigationFlowData;
}

export interface NavigationFlowData {
  question: string;
  totalParticipants: number;
  totalSelections: number;
  researchId: string;
  imageSelections: Record<string, {
    hitzoneId: string;
    click: {
      x: number;
      y: number;
      hitzoneWidth: number;
      hitzoneHeight: number;
    };
  }>;
  visualClickPoints: VisualClickPoint[];
  allClicksTracking: ClickTrackingData[];
  files: ImageFile[];
}

export interface VisualClickPoint {
  x: number;
  y: number;
  timestamp: number;
  isCorrect: boolean;
  imageIndex: number;
  participantId?: string;
}

export interface ClickTrackingData {
  x: number;
  y: number;
  timestamp: number;
  hitzoneId?: string;
  imageIndex: number;
  isCorrectHitzone: boolean;
  participantId?: string;
}

export interface NavigationMetrics {
  totalClicks: number;
  totalParticipants: number;
  correctClicks: number;
  incorrectClicks: number;
  averageTimePerImage: number;
  completionRate: number;
}

export interface HeatmapArea {
  id: string;
  x: number;
  y: number;
  intensity: number;
  imageIndex: number;
}

export interface AOI {
  id: string;
  name: string;
  coordinates: ConvertedHitZone;
}

export interface ConvertedHitZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HitZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageFile {
  id: string;
  url: string;
  name: string;
  hitZones?: Array<{
    id: string;
    name?: string;
    region?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fileId?: string;
  }>;
}