import { useEffect, useRef, useState } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useSessionStore } from '../stores/useSessionStore';
import { publicService } from '../services/public.service';
import { mediaService } from '../services/media.service';
import { queryClient } from '../providers/queryClient';

/** Delay in ms before kiosk auto-resets to welcome for next participant */
const KIOSK_TRANSITION_DELAY = 4000;

// Turnstile temporarily disabled - will be re-enabled when TURNSTILE_SECRET_KEY is configured
const TURNSTILE_ENABLED = false;

export const useKioskMode = (
  currentStep: string,
  isPreviewMode: boolean,
  researchId: string | undefined,
  clearAllResponses: () => void,
  startNewSession: () => void,
) => {
  const [kioskTransition, setKioskTransition] = useState(false);
  const kioskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Prevents scheduling multiple kiosk reset timeouts (Safari re-renders can trigger effect repeatedly) */
  const kioskResetScheduledRef = useRef(false);

  const participationMode = useParticipantStore((state) => state.participationMode);

  // Cleanup kiosk timer on unmount
  useEffect(() => {
    return () => {
      if (kioskTimerRef.current) clearTimeout(kioskTimerRef.current);
    };
  }, []);

  // Kiosk auto-reset: when currentStep becomes 'thank-you' in kiosk mode,
  // show transition screen then reset for next participant.
  // Only schedule once per thank-you visit (ref guard) to avoid loop in Safari where effect re-runs each render.
  useEffect(() => {
    if (currentStep !== 'thank-you' || isPreviewMode || participationMode !== 'kiosk' || !researchId) return;
    if (kioskResetScheduledRef.current) return;

    kioskResetScheduledRef.current = true;
    setKioskTransition(true);
    kioskTimerRef.current = setTimeout(async () => {
      try {
        const newId = await publicService.requestKioskSession(researchId);
        clearAllResponses();
        startNewSession();
        mediaService.clearCache();
        queryClient.clear();
        useParticipantStore.getState().setParticipantId(newId);
        useSessionStore.getState().clearTurnstileToken();
        if (!TURNSTILE_ENABLED) {
          useSessionStore.getState().setTurnstileToken('disabled');
        }
        useParticipantStore.getState().setCurrentStep('welcome');
      } catch (err) {
        console.error('Error resetting kiosk session:', err);
        window.location.reload();
      } finally {
        kioskResetScheduledRef.current = false;
        setKioskTransition(false);
      }
    }, KIOSK_TRANSITION_DELAY);

    return () => {
      if (kioskTimerRef.current) {
        clearTimeout(kioskTimerRef.current);
        kioskTimerRef.current = null;
      }
      kioskResetScheduledRef.current = false;
    };
  }, [currentStep, isPreviewMode, participationMode, researchId, clearAllResponses, startNewSession]);

  return { kioskTransition, participationMode };
};
