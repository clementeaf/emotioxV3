import { useCallback, useRef, useState } from 'react';

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

interface UseUserJourneyTrackingProps {
  enabled?: boolean;
  researchId?: string | null;
}

interface UseUserJourneyTrackingReturn {
  trackStepVisit: (step: string, action?: 'visit' | 'complete' | 'back' | 'skip') => void;
  getJourneyData: () => JourneyData | null;
  isTracking: boolean;
  resetJourney: () => void;
}

export const useUserJourneyTracking = ({
  enabled = false,
  researchId
}: UseUserJourneyTrackingProps): UseUserJourneyTrackingReturn => {
  const [isTracking, setIsTracking] = useState(false);
  const journeyRef = useRef<JourneyData | null>(null);
  const stepStartTimeRef = useRef<number>(0);

  const initializeJourney = useCallback(() => {
    if (!enabled) return;

    journeyRef.current = {
      navigationPath: [],
      totalSteps: 0,
      totalTime: 0,
      hasBackNavigation: false,
      skippedSteps: [],
      currentStep: '',
      sessionStartTime: Date.now()
    };

    setIsTracking(true);;
  }, [enabled]);

  const trackStepVisit = useCallback((step: string, action: 'visit' | 'complete' | 'back' | 'skip' = 'visit') => {
    if (!enabled || !journeyRef.current) {
      if (enabled && !journeyRef.current) {
        initializeJourney();
      }
      return;
    }

    const now = Date.now();
    const timestamp = new Date().toISOString();

    // Calcular duración del step anterior
    let duration: number | undefined;
    if (stepStartTimeRef.current > 0) {
      duration = now - stepStartTimeRef.current;
    }

    // Crear entrada del step
    const stepEntry: JourneyStep = {
      step,
      timestamp,
      duration,
      action
    };

    // Agregar al recorrido
    journeyRef.current.navigationPath.push(stepEntry);
    journeyRef.current.currentStep = step;
    journeyRef.current.totalSteps = journeyRef.current.navigationPath.length;

    // Detectar navegación hacia atrás
    if (action === 'back') {
      journeyRef.current.hasBackNavigation = true;
    }

    // Detectar steps saltados
    if (action === 'skip') {
      if (!journeyRef.current.skippedSteps.includes(step)) {
        journeyRef.current.skippedSteps.push(step);
      }
    }

    // Actualizar tiempo total
    if (journeyRef.current.sessionStartTime > 0) {
      journeyRef.current.totalTime = now - journeyRef.current.sessionStartTime;
    }

    // Iniciar tiempo para el siguiente step
    stepStartTimeRef.current = now;
  }, [enabled, initializeJourney]);

  const getJourneyData = useCallback(() => {
    return journeyRef.current;
  }, []);

  const resetJourney = useCallback(() => {
    journeyRef.current = null;
    stepStartTimeRef.current = 0;
    setIsTracking(false);
  }, []);

  return {
    trackStepVisit,
    getJourneyData,
    isTracking,
    resetJourney
  };
};
