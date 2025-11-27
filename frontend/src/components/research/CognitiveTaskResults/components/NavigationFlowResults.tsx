/**
 * 🧭 NAVIGATION FLOW RESULTS - Clean Replacement
 * Replaces the original 932-line file with modular architecture
 * Imports from NavigationFlow module following SOLID principles
 */

export { default as NavigationFlowResults } from './NavigationFlow';

// Re-export types for backwards compatibility
export type {
  NavigationFlowResultsProps,
  NavigationFlowData,
  HeatmapArea,
  AOI,
  ConvertedHitZone,
  HitZone,
  ImageFile,
  NavigationMetrics,
  VisualClickPoint,
  ClickTrackingData
} from './NavigationFlow/types';