import { useEffect, useRef, useState } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useSessionStore } from '../stores/useSessionStore';
import { publicService } from '../services/public.service';
import { mediaService } from '../services/media.service';
import { queryClient } from '../providers/queryClient';

const KIOSK_TRANSITION_DELAY = 15000;
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
  const kioskResetScheduledRef = useRef(false);

  const participationMode = useParticipantStore((state) => state.participationMode);

  useEffect(() => {
    return () => {
      if (kioskTimerRef.current) clearTimeout(kioskTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (currentStep !== 'thank-you' || isPreviewMode || participationMode !== 'kiosk' || !researchId) return;
    if (kioskResetScheduledRef.current) return;

    kioskResetScheduledRef.current = true;
    kioskTimerRef.current = setTimeout(async () => {
      setKioskTransition(true);
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
