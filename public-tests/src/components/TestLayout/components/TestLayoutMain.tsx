import React, { useCallback, useState, useEffect } from 'react';
import TestLayoutRenderer from '../TestLayoutRenderer';
import TestLayoutSidebar from '../sidebar/TestLayoutSidebar';
import { SidebarStep } from '../types/types';
import { usePreviewModeStore } from '../../../stores/usePreviewModeStore';
import { useTestStore } from '../../../stores/useTestStore';
import { useParticipantStore } from '../../../stores/useParticipantStore';
import { useEyeTrackingConfigQuery } from '../../../hooks/useEyeTrackingConfigQuery';
import { getUrlParams } from '../../../hooks/useUrlParams';

const TestLayoutMain: React.FC = () => {
  const [, setSidebarSteps] = useState<SidebarStep[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const isPreviewMode = usePreviewModeStore((state) => state.isPreviewMode);
  const { researchId, setParticipant } = useTestStore();
  const { setParticipantId } = useParticipantStore.getState();
  const { setPreviewMode } = usePreviewModeStore.getState();
  const { data: eyeTrackingConfig } = useEyeTrackingConfigQuery(researchId || '');
  
  // Leer parámetros de query cuando se accede directamente a /test?researchId=...&participantId=...
  // Usar función síncrona para leer antes de que React renderice
  useEffect(() => {
    // Si ya tenemos researchId, marcar como inicializado
    if (researchId) {
      setIsInitializing(false);
      return;
    }

    // Leer parámetros de forma síncrona usando la función helper
    const { researchId: queryResearchId, participantId: queryParticipantId } = getUrlParams();
    
    if (queryResearchId) {
      if (queryParticipantId) {
        setPreviewMode(false);
        setParticipantId(queryParticipantId);
        
        const participantName = `Participante ${queryParticipantId.slice(-6).toUpperCase()}`;
        const participantEmail = `${queryParticipantId.slice(-8)}@participant.study`;
        
        setParticipant(
          queryParticipantId,
          participantName,
          participantEmail,
          queryResearchId
        );
      } else {
        setPreviewMode(true);
        
        const previewParticipantId = `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setParticipantId(previewParticipantId);
        
        const participantName = `Preview User`;
        const participantEmail = `preview@test.local`;
        
        setParticipant(
          previewParticipantId,
          participantName,
          participantEmail,
          queryResearchId
        );
      }
      
      // Verificar que el store se actualizó correctamente
      // En móviles, el store puede tardar más en actualizarse
      const checkStore = setInterval(() => {
        const { researchId: currentResearchId } = useTestStore.getState();
        if (currentResearchId === queryResearchId) {
          setIsInitializing(false);
          clearInterval(checkStore);
        }
      }, 50);
      
      // Timeout de seguridad: marcar como inicializado después de 1 segundo máximo
      setTimeout(() => {
        clearInterval(checkStore);
        setIsInitializing(false);
      }, 1000);
    } else {
      // No hay queryResearchId en la URL, marcar como inicializado
      setIsInitializing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researchId]); // Ejecutar cuando cambie researchId del store
  
  const shouldShowSidebar = eyeTrackingConfig?.linkConfig?.showProgressBar ?? true;

  const handleStepsReady = useCallback((steps: SidebarStep[]) => {
    setSidebarSteps(steps);
  }, []);

  // Mostrar loading mientras se inicializan los parámetros
  if (isInitializing && !researchId) {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-center bg-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Cargando investigación...</p>
      </div>
    );
  }

  return (
    <>
      {/* Banner de modo preview */}
      {isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 text-center font-medium shadow-md z-50">
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span>MODO PREVIEW - Las respuestas no se guardarán</span>
          </div>
        </div>
      )}

      <main className="w-screen h-screen flex flex-col items-center justify-center px-2 sm:px-4 sm:pt-14 sm:pb-20 bg-neutral-50">
        <div className={`flex w-full max-w-4xl lg:max-w-5xl`}>
          {shouldShowSidebar && (
            <TestLayoutSidebar
              onStepsReady={handleStepsReady}
              onNavigateToStep={() => { }}
            />
          )}
          <div className={`bg-white shadow-soft rounded-2xl p-[2.5%] sm:p-[3%] justify-center w-full h-full`}>
            <TestLayoutRenderer />
          </div>
        </div>
      </main>
    </>
  );
};

export default TestLayoutMain;
