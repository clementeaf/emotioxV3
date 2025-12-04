import React, { useCallback } from 'react';
import { useTestStore } from '../stores/useTestStore';
import { useModuleResponsesQuery, useSaveModuleResponseMutation, useUpdateModuleResponseMutation } from './useApiQueries';
import { useEyeTrackingConfigQuery } from './useEyeTrackingConfigQuery';
import { useOptimizedMonitoringWebSocket } from './useOptimizedMonitoringWebSocket';
import { useUserJourneyTracking } from './useUserJourneyTracking';
import { useResponseTiming } from './useResponseTiming';
import { useAvailableFormsQuery } from './useApiQueries';

interface UseAutoSaveProps {
  currentQuestionKey: string;
  formValues: Record<string, unknown>;
}

export const useAutoSave = ({ currentQuestionKey, formValues }: UseAutoSaveProps) => {
  const { researchId, participantId } = useTestStore();

  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');
  const shouldTrackTiming = eyeTrackingConfig?.parameterOptions?.saveResponseTimes || false;
  const shouldTrackUserJourney = eyeTrackingConfig?.parameterOptions?.saveUserJourney || false;

  const { sendParticipantResponseSaved } = useOptimizedMonitoringWebSocket();

  const { data: moduleResponses } = useModuleResponsesQuery(
    researchId || '',
    participantId || ''
  );

  const { data: formsData } = useAvailableFormsQuery(researchId || '');

  const steps = React.useMemo(() => {
    if (formsData?.steps && formsData?.stepsConfiguration) {
      return (formsData.steps as unknown as Array<{ title: string; questionKey: string }>)
        .map((step: { title: string; questionKey: string }) => {
          const config = (formsData.stepsConfiguration as unknown as Record<string, unknown>)[step.questionKey];
          return config ? { ...step, ...config } : null;
        })
        .filter((step: { title: string; questionKey: string } | null): step is NonNullable<typeof step> => step !== null);
    }
    return [];
  }, [formsData?.steps, formsData?.stepsConfiguration]);

  const saveMutation = useSaveModuleResponseMutation({
    onSuccess: () => { },
    onError: () => { }
  });

  const updateMutation = useUpdateModuleResponseMutation({
    onSuccess: () => { },
    onError: () => { }
  });

  const { endTiming, getTimingData } = useResponseTiming({
    questionKey: currentQuestionKey,
    enabled: shouldTrackTiming
  });

  const { trackStepVisit } = useUserJourneyTracking({
    enabled: shouldTrackUserJourney,
    researchId
  });

  const autoSave = useCallback(async (immediateData?: Record<string, unknown>) => {
    if (!researchId || !participantId) {
      return;
    }

    try {
      // 🎯 USAR DATOS INMEDIATOS SI SE PROPORCIONAN, SINO USAR FORMVALUES
      const currentFormData = immediateData || formValues || {};

      if (!currentFormData || Object.keys(currentFormData).length === 0) {
        return;
      }

      if (shouldTrackUserJourney) {
        trackStepVisit(currentQuestionKey, 'visit');
      }

      if (shouldTrackTiming) {
        endTiming();
        const timingData = getTimingData();
        // Timing data logging removido
      }

      const finalMetadata = {
        deviceInfo: {
          deviceType: 'desktop' as const,
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          platform: navigator.platform,
          language: navigator.language
        },
        timingInfo: {
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0
        }
      };

      const safeMetadata = Object.keys(finalMetadata).length > 0 ? finalMetadata : {
        deviceInfo: {
          deviceType: 'desktop' as const,
          userAgent: navigator.userAgent,
          screenWidth: window.screen.width,
          screenHeight: window.screen.height,
          platform: navigator.platform,
          language: navigator.language
        },
        timingInfo: {
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0
        }
      };

      const formatResponseData = (data: unknown): string | number | boolean | string[] | Record<string, string | number | boolean | null> | null => {
        if (data === null || data === undefined) return null;
        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return data;
        if (Array.isArray(data)) {
          const limitedArray = data.slice(0, 10).map(item => String(item));
          return limitedArray;
        }
        if (typeof data === 'object') {
          const simpleObject: Record<string, string | number | boolean | null> = {};
          const entries = Object.entries(data as Record<string, unknown>);

          for (const [key, value] of entries.slice(0, 5)) {
            if (value === null || value === undefined) {
              simpleObject[key] = null;
            } else if (typeof value === 'string') {
              simpleObject[key] = value.length > 100 ? value.substring(0, 100) + '...' : value;
            } else if (typeof value === 'number' || typeof value === 'boolean') {
              simpleObject[key] = value;
            } else if (Array.isArray(value)) {
              // Para smartvoc_nev, convertir a string SIN limitar cantidad
              if (currentQuestionKey === 'smartvoc_nev') {
                simpleObject[key] = value.map(item => String(item)).join(',');
              } else {
                simpleObject[key] = value.slice(0, 3).map(item => String(item)).join(',');
              }
            } else if (typeof value === 'object') {
              const jsonStr = JSON.stringify(value);
              simpleObject[key] = jsonStr.length > 200 ? jsonStr.substring(0, 200) + '...' : jsonStr;
            } else {
              simpleObject[key] = String(value).substring(0, 100);
            }
          }
          return simpleObject;
        }
        return String(data).substring(0, 100);
      };

      let formattedResponse = formatResponseData(currentFormData);
      const timestamp = new Date().toISOString();
      const now = new Date().toISOString();

      const responseSize = JSON.stringify(formattedResponse).length;
      if (responseSize > 5000 && currentQuestionKey !== 'smartvoc_nev') {
        if (typeof formattedResponse === 'object' && formattedResponse !== null) {
          const truncatedResponse: Record<string, string | number | boolean | null> = {};
          for (const [key, value] of Object.entries(formattedResponse).slice(0, 3)) {
            if (typeof value === 'string') {
              truncatedResponse[key] = value.substring(0, 50);
            } else {
              truncatedResponse[key] = value;
            }
          }
          formattedResponse = truncatedResponse;
        }
      }

      const currentDocumentSize = moduleResponses ? JSON.stringify(moduleResponses).length : 0;
      const estimatedNewSize = currentDocumentSize + responseSize;

      if (estimatedNewSize > 350000 && currentQuestionKey !== 'smartvoc_nev') {
        if (typeof formattedResponse === 'object' && formattedResponse !== null) {
          const aggressiveTruncation: Record<string, string | number | boolean | null> = {};
          for (const [key, value] of Object.entries(formattedResponse).slice(0, 2)) { // Solo 2 propiedades
            if (typeof value === 'string') {
              aggressiveTruncation[key] = value.substring(0, 25); // Solo 25 caracteres
            } else {
              aggressiveTruncation[key] = value;
            }
          }
          formattedResponse = aggressiveTruncation;
        }
      }

      const existingResponse = moduleResponses?.responses?.find(
        (moduleResponse: { questionKey: string }) => moduleResponse.questionKey === currentQuestionKey
      );
      const hasExistingResponse = !!existingResponse;
      const documentId = moduleResponses?.id;

      if (hasExistingResponse) {
        const updateData = {
          researchId: researchId || '',
          participantId: participantId || '',
          questionKey: currentQuestionKey,
          responses: [{
            questionKey: currentQuestionKey,
            response: formattedResponse,
            timestamp,
            createdAt: existingResponse?.createdAt || now,
            updatedAt: now
          }],
          metadata: safeMetadata
        };

        if (!documentId) {
          throw new Error('No se encontró documentId para actualizar la respuesta');
        }

        await updateMutation.mutateAsync({
          responseId: documentId,
          data: updateData
        });
      } else {
        const createData = {
          researchId: researchId || '',
          participantId: participantId || '',
          questionKey: currentQuestionKey,
          responses: [{
            questionKey: currentQuestionKey,
            response: formattedResponse,
            timestamp,
            createdAt: now
          }],
          metadata: safeMetadata
        };

        await saveMutation.mutateAsync(createData);
      }

      if (participantId) {
        const currentStepIndex = steps.findIndex((step: { questionKey: string }) => step.questionKey === currentQuestionKey);
        const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100);

        sendParticipantResponseSaved(
          participantId,
          currentQuestionKey,
          currentFormData,
          currentStepIndex + 1,
          steps.length,
          progress
        );
      }

    } catch (error) {
      console.error('[useAutoSave] ❌ Error en guardado automático:', error);
    }
  }, [
    researchId,
    participantId,
    currentQuestionKey,
    formValues,
    shouldTrackUserJourney,
    shouldTrackTiming,
    trackStepVisit,
    endTiming,
    getTimingData,
    moduleResponses,
    steps,
    saveMutation,
    updateMutation,
    sendParticipantResponseSaved
  ]);

  return { autoSave };
};
