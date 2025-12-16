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
import { publicService, type Module, type ResearchData } from '../services/public.service';
import { responseService } from '../services/response.service';
import { MOCK_MODULES } from '../data/mockModules';

/**
 * Checks whether a value is a plain object record.
 * @param value - Unknown value
 * @returns True if value is a non-null object and not an array
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * Extracts a boolean-only map from an unknown value.
 * @param value - Unknown value
 * @returns Object containing only boolean properties
 */
const toBooleanRecord = (value: unknown): Record<string, boolean> => {
  if (!isRecord(value)) return {};
  const result: Record<string, boolean> = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue === 'boolean') {
      result[key] = entryValue;
    }
  });
  return result;
};

/**
 * Finds linkConfig within the "Research Configuration" module, if present.
 * @param research - Research payload from public API
 * @returns Boolean map with link configuration flags
 */
const getLinkConfig = (research: ResearchData): Record<string, boolean> => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const linkConfigValue: unknown = isRecord(module.config) ? module.config.linkConfig : undefined;
      return toBooleanRecord(linkConfigValue);
    }
  }
  return {};
};

export const ResearchPage = () => {
  const { researchId } = useParams<{ researchId: string }>();
  const { isPreviewMode, participantId } = usePreviewMode();
  const { setConfig } = useSessionStore();
  const { getResponsesByModule, startNewSession, clearAllResponses } = useParticipantStore();
  const { currentStep, goNext, isLastStep } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modules, setModules] = useState<Record<string, Module>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileRestriction, setMobileRestriction] = useState<string | null>(null);
  const [showRestartOption, setShowRestartOption] = useState(false);

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
        setMobileRestriction(null);
        setShowRestartOption(false);

        // Fetch research data from backend
        const research = await publicService.getResearch(researchId);

        // Check mobile device restriction
        const linkConfig = getLinkConfig(research);

        // Get device info from session store
        const deviceType = useSessionStore.getState().deviceInfo?.deviceType;
        
        // If mobile devices are not allowed and user is on mobile/tablet
        if (linkConfig.allowMobile === false && deviceType && (deviceType === 'mobile' || deviceType === 'tablet')) {
          setMobileRestriction('This research is not available on mobile devices. Please access it from a desktop computer.');
          setModules({});
          setLoading(false);
          return;
        }

        // Transform stages and modules into flat structure for navigation
        const modulesMap: Record<string, Module> = {};
        let index = 0;

        // Backend returns modules directly, wrap them in a stage if needed
        const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
        
        stages.forEach(stage => {
          const modules = stage.modules || [];
          modules.forEach(module => {
            const key = `module-${index}`;
            modulesMap[key] = module as Module;
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
          linkConfig: linkConfig,
        });

        console.log('✓ Research loaded:', research.title || research.name, `(${Object.keys(modulesMap).length} modules)`);
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

    void loadResearch();
  }, [researchId, setConfig]);

  // Check if we're in development mode
  const isDev = useMemo(() => import.meta.env.DEV, []);

  // Get current module
  const currentModule = useMemo(() => modules[currentStep], [modules, currentStep]);

  const handleNext = useCallback(async () => {
    // Handle restart option for multiple sessions
    if (showRestartOption && currentStep === 'thank-you') {
      // Start a new session
      startNewSession();
      clearAllResponses();
      // Reset to first step
      useParticipantStore.getState().setCurrentStep('welcome');
      setShowRestartOption(false);
      return;
    }

    // In preview mode, don't send data to backend
    if (isPreviewMode) {
      console.log('[Preview Mode] Skipping data submission');
      const result = goNext();
      if (!result.success && result.errors) {
        const errorMessage = result.errors.map(e => e.message).join('\n');
        alert(errorMessage);
      }
      
      // Check if we've reached the thank-you page and multiple sessions are allowed
      if (result.success && currentStep === 'thank-you') {
        const linkConfig = useSessionStore.getState().config?.linkConfig;
        if (linkConfig?.allowMultiple === true) {
          setShowRestartOption(true);
        }
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
    
    // Check if we've reached the thank-you page and multiple sessions are allowed
    if (result.success && currentStep === 'thank-you') {
      const linkConfig = useSessionStore.getState().config?.linkConfig;
      if (linkConfig?.allowMultiple === true) {
        setShowRestartOption(true);
      }
    }
  }, [isPreviewMode, participantId, researchId, currentModule, getResponsesByModule, goNext, showRestartOption, startNewSession, clearAllResponses, currentStep]);

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

  // Show mobile restriction message
  if (mobileRestriction) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Restricted
          </h1>
          <p className="text-gray-600 mb-6">
            {mobileRestriction}
          </p>
          <Button onClick={() => window.location.reload()}>
            Reload Page
          </Button>
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
            disabled={submitting}
          >
            {submitting ? 'Guardando...' : showRestartOption ? 'Comenzar de nuevo' : isLastStep ? 'Finalizar' : 'Guardar y continuar'}
          </Button>
        }
      >
        {currentModule ? (
          <DynamicStep module={currentModule} />
        ) : showRestartOption ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
            <div className="bg-green-100 rounded-full p-3 mb-4">
              <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              ¡Gracias por completar la encuesta!
            </h1>
            <p className="text-gray-600 max-w-md">
              Esta investigación permite múltiples respuestas. Puedes comenzar de nuevo si lo deseas.
            </p>
          </div>
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