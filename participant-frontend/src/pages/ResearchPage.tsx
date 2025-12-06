import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { DevSidebar } from '../components/layout/DevSidebar';
import { DynamicStep } from '../components/steps/DynamicStep';
import { PreviewModeBanner } from '../components/ui/PreviewModeBanner';
import { useSessionStore } from '../stores/useSessionStore';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useNavigation } from '../hooks/useNavigation';
import { useDeviceCollector } from '../hooks/useDeviceCollector';
import { useLocationCollector } from '../hooks/useLocationCollector';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { usePreviewMode } from '../hooks/usePreviewMode';
import { publicService, type Module } from '../services/public.service';
import { responseService } from '../services/response.service';
import { MOCK_MODULES } from '../data/mockModules';

export const ResearchPage = () => {
  const { researchId } = useParams<{ researchId: string }>();
  const { isPreviewMode, participantId } = usePreviewMode();
  const { setConfig } = useSessionStore();
  const { getResponsesByModule } = useParticipantStore();
  const { currentStep, goNext, isLastStep } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modules, setModules] = useState<Record<string, Module>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize device collector
  useDeviceCollector();
  
  // Initialize location collector (will be called manually when needed)
  useLocationCollector();
  
  // Initialize session timer
  useSessionTimer();

  // Load research configuration
  useEffect(() => {
    if (!researchId) return;

    const loadResearch = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch research data from backend
        const research = await publicService.getResearch(researchId);

        // Transform stages and modules into flat structure for navigation
        const modulesMap: Record<string, Module> = {};
        let index = 0;

        research.stages.forEach(stage => {
          stage.modules.forEach(module => {
            const key = `module-${index}`;
            modulesMap[key] = module;
            index++;
          });
        });

        setModules(modulesMap);

        // Set session configuration
        setConfig({
          id: researchId,
          settings: {
            enableLocationCapture: true,
            enableDeviceCapture: true,
            enableSessionRecording: true,
            enableInteractionTracking: true,
          },
        });

        console.log('✓ Research loaded:', research.title, `(${Object.keys(modulesMap).length} modules)`);
      } catch (err) {
        console.error('Failed to load research:', err);
        setError('Failed to load research. Please try again.');
        
        // Fallback to mock modules in development
        if (import.meta.env.DEV) {
          console.warn('Using mock modules as fallback');
          setModules(MOCK_MODULES);
        }
      } finally {
        setLoading(false);
      }
    };

    loadResearch();
  }, [researchId, setConfig]);

  // Check if we're in development mode
  const isDev = useMemo(() => import.meta.env.DEV, []);

  // Get current module
  const currentModule = useMemo(() => modules[currentStep], [modules, currentStep]);

  const handleNext = useCallback(async () => {
    // In preview mode, don't send data to backend
    if (isPreviewMode) {
      console.log('[Preview Mode] Skipping data submission');
      const result = goNext();
      if (!result.success && result.errors) {
        const errorMessage = result.errors.map(e => e.message).join('\n');
        alert(errorMessage);
      }
      return;
    }

    // In participant mode, send data to backend
    if (participantId && researchId && currentModule) {
      // Get all responses for current module
      const moduleResponses = getResponsesByModule(currentModule.id).map((response) => ({
        moduleId: currentModule.id,
        componentId: response.componentId,
        value: response.value,
        metadata: {
          timestamp: response.metadata?.timestamp || Date.now(),
          ...response.metadata,
        },
      }));

      // Only submit if there are responses to send
      if (moduleResponses.length > 0) {
        try {
          setSubmitting(true);
          console.log(`[Participant Mode] Submitting responses for module: ${currentModule.id}`);

          await responseService.submitModuleResponses(researchId, participantId, {
            participantId,
            moduleId: currentModule.id,
            responses: moduleResponses,
            metadata: {
              completedAt: Date.now(),
            },
          });

          console.log(`✓ Submitted ${moduleResponses.length} responses for module ${currentModule.id}`);
        } catch (error) {
          console.error('Error submitting responses:', error);
          // Don't block navigation on error, just log it
          alert('Error al guardar respuestas. Por favor, intenta nuevamente.');
          setSubmitting(false);
          return;
        } finally {
          setSubmitting(false);
        }
      } else {
        console.log(`[Participant Mode] No responses to submit for module: ${currentModule.id}`);
      }
    }

    // Navigate to next step
    const result = goNext();
    if (!result.success && result.errors) {
      const errorMessage = result.errors.map(e => e.message).join('\n');
      alert(errorMessage);
    }
  }, [isPreviewMode, participantId, researchId, currentModule, getResponsesByModule, goNext]);

  if (!researchId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Invalid Research
          </h1>
          <p className="text-gray-600">
            No research ID provided
          </p>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading research...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Development Sidebar */}
      {isDev && (
        <DevSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && <PreviewModeBanner />}

      <MainLayout
        footer={
          <Button
            onClick={handleNext}
            disabled={isLastStep || submitting}
          >
            {submitting ? 'Guardando...' : isLastStep ? 'Finalizar' : 'Guardar y continuar'}
          </Button>
        }
      >
        {currentModule ? (
          <DynamicStep module={currentModule} />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Step: {currentStep}
            </h1>
            <p className="text-gray-500">
              Este paso aún no está configurado.
            </p>
          </div>
        )}
      </MainLayout>
    </>
  );
};
