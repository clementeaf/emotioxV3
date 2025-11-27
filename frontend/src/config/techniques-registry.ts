// 🎯 CENTRALIZED TECHNIQUE CONFIGURATION
// Add new techniques in ONE place only!

export interface TechniqueConfig {
  id: string;
  name: string;
  description: string;
  stages: string[];  // Stage IDs from stages-registry
  features?: {
    hasScreener?: boolean;
    hasImplicitAssociation?: boolean;
    hasEyeTracking?: boolean;
    hasBiometrics?: boolean;
  };
  settings?: {
    minParticipants?: number;
    maxParticipants?: number;
    estimatedDuration?: number; // in minutes
  };
}

// ✨ ADD NEW TECHNIQUES HERE - That's ALL! ✨
export const TECHNIQUES_REGISTRY: Record<string, TechniqueConfig> = {
  'default': {
    id: 'default',
    name: 'Standard Research',
    description: 'Basic research flow with VOC and cognitive tasks',
    stages: [
      'welcome-screen',
      'smart-voc',
      'cognitive',
      'thank-you'
    ],
    features: {
      hasScreener: false,
      hasImplicitAssociation: false,
      hasEyeTracking: false,
      hasBiometrics: false
    },
    settings: {
      minParticipants: 10,
      maxParticipants: 100,
      estimatedDuration: 15
    }
  },

  'biometric-cognitive': {
    id: 'biometric-cognitive',
    name: 'Biometric & Cognitive Analysis',
    description: 'Advanced research with biometric tracking and cognitive analysis',
    stages: [
      'screener',
      'welcome-screen',
      'implicit-association',
      'cognitive',
      'eye-tracking',
      'thank-you'
    ],
    features: {
      hasScreener: true,
      hasImplicitAssociation: true,
      hasEyeTracking: true,
      hasBiometrics: true
    },
    settings: {
      minParticipants: 20,
      maxParticipants: 200,
      estimatedDuration: 25
    }
  },

  'eye-tracking': {
    id: 'eye-tracking',
    name: 'Eye Tracking Study',
    description: 'Visual attention and gaze pattern analysis',
    stages: [
      'welcome-screen',
      'eye-tracking',
      'smart-voc',
      'thank-you'
    ],
    features: {
      hasScreener: false,
      hasImplicitAssociation: false,
      hasEyeTracking: true,
      hasBiometrics: false
    },
    settings: {
      minParticipants: 15,
      maxParticipants: 50,
      estimatedDuration: 30
    }
  },

  // 🚀 DEMO: New technique added in ONE place only!
  'neuro-marketing': {
    id: 'neuro-marketing',
    name: 'Neuromarketing Research',
    description: 'Complete neuromarketing analysis with all tools',
    stages: [
      'screener',
      'welcome-screen',
      'implicit-association',
      'eye-tracking',
      'smart-voc',
      'cognitive',
      'thank-you'
    ],
    features: {
      hasScreener: true,
      hasImplicitAssociation: true,
      hasEyeTracking: true,
      hasBiometrics: true
    },
    settings: {
      minParticipants: 30,
      maxParticipants: 150,
      estimatedDuration: 45
    }
  }
};

// === AUTO-GENERATED EXPORTS ===

// Get all technique IDs
export const TECHNIQUE_IDS = Object.keys(TECHNIQUES_REGISTRY);

// Get technique by ID
export const getTechnique = (id: string): TechniqueConfig | undefined => {
  return TECHNIQUES_REGISTRY[id];
};

// Get stages for a technique
export const getTechniqueStages = (techniqueId: string): string[] => {
  return TECHNIQUES_REGISTRY[techniqueId]?.stages || TECHNIQUES_REGISTRY.default.stages;
};

// Get all techniques with a specific feature
export const getTechniquesWithFeature = (feature: keyof TechniqueConfig['features']): TechniqueConfig[] => {
  return Object.values(TECHNIQUES_REGISTRY).filter(
    technique => technique.features?.[feature] === true
  );
};

// Check if a technique has a specific stage
export const techniqueHasStage = (techniqueId: string, stageId: string): boolean => {
  const technique = getTechnique(techniqueId);
  return technique?.stages.includes(stageId) || false;
};

// Get technique display info for UI
export const getTechniqueDisplayInfo = (techniqueId: string) => {
  const technique = getTechnique(techniqueId);
  if (!technique) return null;

  return {
    id: technique.id,
    name: technique.name,
    description: technique.description,
    stageCount: technique.stages.length,
    estimatedDuration: technique.settings?.estimatedDuration || 0,
    features: Object.entries(technique.features || {})
      .filter(([_, enabled]) => enabled)
      .map(([feature]) => feature.replace('has', ''))
  };
};

// Generate technique constants (for backwards compatibility)
export const RESEARCH_TECHNIQUES = {
  DEFAULT: 'default',
  BIOMETRIC_COGNITIVE: 'biometric-cognitive',
  EYE_TRACKING: 'eye-tracking'
} as const;

// Generate technique build sequences (for backwards compatibility)
export const TECHNIQUE_BUILD_SEQUENCES = Object.fromEntries(
  Object.entries(TECHNIQUES_REGISTRY).map(([key, config]) => [key, config.stages])
);