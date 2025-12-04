interface JourneyStep {
  step: string;
  timestamp: string;
  duration?: number;
  action: 'visit' | 'complete' | 'back' | 'skip';
}

interface JourneyData {
  navigationPath: JourneyStep[];
  totalSteps: number;
  totalTime: number;
  hasBackNavigation: boolean;
  skippedSteps: string[];
  currentStep: string;
  sessionStartTime: number;
}

interface UserJourneyMetadata {
  userJourney?: {
    navigationPath: JourneyStep[];
    totalSteps: number;
    totalTime: number;
    hasBackNavigation: boolean;
    skippedSteps: string[];
    currentStep: string;
    sessionStartTime: number;
    averageTimePerStep: number;
    completionRate: number;
  };
}

export const buildUserJourneyMetadata = (
  journeyData: JourneyData | null,
  existingMetadata: Record<string, unknown> = {}
): Record<string, unknown> => {
  if (!journeyData) {
    return existingMetadata;
  }

  // Calcular métricas adicionales
  const averageTimePerStep = journeyData.totalSteps > 0
    ? Math.round(journeyData.totalTime / journeyData.totalSteps)
    : 0;

  const completionRate = journeyData.totalSteps > 0
    ? Math.round((journeyData.navigationPath.filter(step => step.action === 'complete').length / journeyData.totalSteps) * 100)
    : 0;

  const userJourney = {
    navigationPath: journeyData.navigationPath,
    totalSteps: journeyData.totalSteps,
    totalTime: journeyData.totalTime,
    hasBackNavigation: journeyData.hasBackNavigation,
    skippedSteps: journeyData.skippedSteps,
    currentStep: journeyData.currentStep,
    sessionStartTime: journeyData.sessionStartTime,
    averageTimePerStep,
    completionRate
  };

  return {
    ...existingMetadata,
    userJourney
  };
};

export const shouldTrackUserJourney = (researchId: string | null): boolean => {
  // 🎯 VERIFICAR CONFIGURACIÓN REAL
  // Por ahora retornamos false para no afectar funcionamiento actual
  // Se puede implementar consulta real a la API cuando sea necesario
  return false;
};
