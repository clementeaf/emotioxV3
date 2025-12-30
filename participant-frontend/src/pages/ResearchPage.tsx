import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { DevSidebar } from '../components/layout/DevSidebar';
import { DynamicStep } from '../components/steps/DynamicStep';
import { PreviewModeBanner } from '../components/ui/PreviewModeBanner';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { ErrorScreen } from '../components/ui/ErrorScreen';
import { MobileRestrictionScreen } from '../components/ui/MobileRestrictionScreen';
import { InvalidResearchScreen } from '../components/ui/InvalidResearchScreen';
import { ResearchCompletionContent } from '../components/ui/ResearchCompletionContent';
import { UnconfiguredStepContent } from '../components/ui/UnconfiguredStepContent';
import { WelcomeStep } from '../components/steps/WelcomeStep';
import { DemographicsStep } from '../components/steps/DemographicsStep';
import { useSessionStore } from '../stores/useSessionStore';
import { useParticipantStore } from '../stores/useParticipantStore';
import { useNavigation } from '../hooks/useNavigation';
import { useDeviceCollector } from '../hooks/useDeviceCollector';
import { useLocationCollector } from '../hooks/useLocationCollector';
import { useSessionTimer } from '../hooks/useSessionTimer';
import { usePreviewMode } from '../hooks/usePreviewMode';
import { publicService, type Module, type ResearchData } from '../services/public.service';
import { responseService } from '../services/response.service';
import { getComponentText } from '../utils/moduleComponent';
import type { ModuleStructure, ModuleComponent } from '../types/module';

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
 * Determines whether a module is hidden for participants based on module.config.hidden.
 * @param module - Module payload from backend
 * @returns true when module is hidden
 */
const isModuleHidden = (module: Module): boolean => {
  const cfg: unknown = module.config;
  if (!isRecord(cfg)) return false;
  const hidden = cfg.hidden;
  return hidden === true;
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

/**
 * Finds backlinks within the "Research Configuration" module, if present.
 * @param research - Research payload from public API
 * @returns Map of backlink URLs (complete, disqualified, overquota)
 */
const getBacklinks = (research: ResearchData): Record<string, string> => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const config = module.config;
      if (isRecord(config) && isRecord(config.backlinks)) {
        const backlinks: Record<string, string> = {};
        Object.entries(config.backlinks).forEach(([key, value]) => {
          if (typeof value === 'string' && value.trim().length > 0) {
            backlinks[key] = value;
          }
        });
        return backlinks;
      }
    }
  }
  return {};
};

/**
 * Finds demographics configuration, if present.
 */
const getDemographicsConfig = (research: ResearchData): Record<string, unknown> | null => {
  const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];
  for (const stage of stages) {
    for (const module of stage.modules || []) {
      if (module.name !== 'Research Configuration') continue;
      const config = module.config;
      if (isRecord(config) && isRecord(config.demographics)) {
        return config.demographics;
      }
    }
  }
  return null;
};

/**
 * Converts a backend module name to a stable stepId used by the participant flow.
 * @param moduleName - Human readable module name
 * @returns stepId or null if module should not be part of the participant flow
 */
const getStepIdFromModuleName = (moduleName: string): string | null => {
  const trimmed = moduleName.trim();

  if (trimmed === 'Research Configuration') return null;
  if (trimmed === 'Demographics') return 'demographics';

  // Welcome / Thank you screens
  if (trimmed === 'Welcome Screen') return 'welcome';
  if (trimmed === 'Thank You Screen' || trimmed === 'Thank you screen') return 'thank-you';

  // Cognitive tasks
  if (trimmed === 'Short Text') return 'short-text';
  if (trimmed === 'Long Text') return 'long-text';
  if (trimmed === 'Single Choice') return 'single-choice';
  if (trimmed === 'Multiple Choice') return 'multiple-choice';
  if (trimmed === 'Linear Scale') return 'linear-scale';
  if (trimmed === 'Ranking') return 'ranking';
  if (trimmed === 'Navigation Flow') return 'navigation-flow';
  if (trimmed === 'Preference Test') return 'preference-test';

  // SmartVOC
  if (trimmed.includes('CSAT')) return 'csat';
  if (trimmed.includes('NPS')) return 'nps';
  if (trimmed.includes('CES')) return 'ces';
  if (trimmed.includes('CV')) return 'cv';
  if (trimmed.includes('NEV')) return 'nev';
  if (trimmed.includes('VOC')) return 'voc';

  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const ResearchPage = () => {
  const { researchId } = useParams<{ researchId: string }>();
  const { isPreviewMode, participantId } = usePreviewMode();
  const { setConfig } = useSessionStore();
  const { getResponsesByModule, startNewSession, clearAllResponses } = useParticipantStore();
  const [modules, setModules] = useState<Record<string, Module>>({});
  const { currentStep, goNext, isLastStep } = useNavigation(modules);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileRestriction, setMobileRestriction] = useState<string | null>(null);
  const [showRestartOption, setShowRestartOption] = useState(false);
  const [backlinks, setBacklinks] = useState<Record<string, string>>({});

  // Initialize device collector
  useDeviceCollector();

  // Initialize location collector (will be called manually when needed)
  useLocationCollector();

  // Check for participant change (session persistence fix)
  useEffect(() => {
    if (!participantId) return;

    const storedParticipantId = useParticipantStore.getState().participantId;

    // If we have a stored participant ID and it's different from the URL
    if (storedParticipantId && storedParticipantId !== participantId) {
      console.log('[ResearchPage] Participant changed, resetting session');
      clearAllResponses();
      useSessionStore.getState().clearTurnstileToken();
      startNewSession();
    }

    // Always update to current participant ID
    useParticipantStore.getState().setParticipantId(participantId);
  }, [participantId, clearAllResponses, startNewSession]);

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
        // Removed excessive logging for production

        // Log Welcome Screen module details if it exists
        const welcomeModule = research.stages?.flatMap(s => s.modules || [])
          .find(m => m.name === 'Welcome Screen');
        if (welcomeModule) {
          // Removed unused variable and logging for production
        }

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

        // Get backlinks configuration
        const researchBacklinks = getBacklinks(research);
        setBacklinks(researchBacklinks);

        // Check overquota status (placeholder logic - backend support required)
        // If the backend returns a specific status or flag for overquota, handle it here
        if ((research.status === 'overquota' || research.status === 'closed') && researchBacklinks.overquota) {
          window.location.href = researchBacklinks.overquota;
          return;
        }

        /**
         * Normalizes a module from backend format to ModuleConfig format
         * Backend returns: { id, name, description, config: {...}, structure: { components: [...] } }
         * Frontend expects: { id, name, description, structure: { components: [...] } }
         * @param module - Module from backend
         * @returns Normalized module
         */
        const normalizeModule = (module: unknown): Module => {
          if (!isRecord(module)) {
            throw new Error('Invalid module format');
          }

          const moduleId = typeof module.id === 'string' ? module.id : '';
          const moduleName = typeof module.name === 'string' ? module.name : '';
          const moduleDescription = typeof module.description === 'string' ? module.description : '';

          // Extract structure - backend already provides it in structure field
          let structure: ModuleStructure = { components: [] };

          // First try: structure field (backend already extracts it)
          if (isRecord(module.structure) && Array.isArray(module.structure.components)) {
            structure = { components: module.structure.components as ModuleComponent[] };
          }
          // Fallback: config.structure.components (legacy or if backend didn't extract)
          else if (isRecord(module.config)) {
            if (isRecord(module.config.structure) && Array.isArray(module.config.structure.components)) {
              structure = { components: module.config.structure.components as ModuleComponent[] };
            }
            // Legacy format: config.components
            else if (Array.isArray(module.config.components)) {
              structure = { components: module.config.components as ModuleComponent[] };
            }
          }

          return {
            id: moduleId,
            name: moduleName,
            description: moduleDescription,
            structure: structure,
            config: isRecord(module.config) ? module.config : {}
          };
        };

        // Transform stages and modules into flat structure for navigation
        const modulesMap: Record<string, Module> = {};

        // Backend returns modules directly, wrap them in a stage if needed
        const stages = research.stages || [{ id: 'legacy', name: 'Legacy', description: '', order_index: 0, modules: research.modules || [] }];

        const demographicsConfig = getDemographicsConfig(research);
        // Check if any demographic is enabled (boolean true OR object with enabled: true)
        const hasDemographics = demographicsConfig && Object.values(demographicsConfig).some(val => {
          if (val === true) return true;
          if (isRecord(val) && val.enabled === true) return true;
          return false;
        });

        if (hasDemographics) {
          modulesMap['demographics'] = {
            id: 'demographics',
            name: 'Demographics',
            description: 'Demographic Questions',
            structure: { components: [] },
            config: { demographics: demographicsConfig }
          };
        }

        stages.forEach(stage => {
          const modules = stage.modules || [];
          modules.forEach(module => {
            try {
              const normalizedModule = normalizeModule(module);
              if (isModuleHidden(normalizedModule)) return;
              const stepId = getStepIdFromModuleName(normalizedModule.name);
              if (!stepId) return;
              modulesMap[stepId] = normalizedModule;
            } catch (error: unknown) {
              console.error('Error normalizing module:', error, module);
            }
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

        // Removed excessive logging for production
      } catch (err: unknown) {
        console.error('Failed to load research:', err);
        setError('Failed to load research. Please try again.');
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

  // Removed version logging for production

  /**
   * Checks if a component is the start_button_text component
   * @param component - Component to check
   * @returns true if component is start_button_text
   */
  const isStartButtonComponent = useCallback((component: { id?: string; label?: string; name?: string }): boolean => {
    const id = component.id?.toLowerCase() || '';
    const label = component.label?.toLowerCase() || '';
    const name = component.name?.toLowerCase() || '';

    // Check by ID (exact match or contains)
    if (id === 'start_button_text' ||
      id === 'start-button-text' ||
      id.includes('start_button_text') ||
      id.includes('start-button-text')) {
      return true;
    }

    // Check by label/name (more flexible matching)
    if (label.includes('start button') ||
      name.includes('start button') ||
      label === 'start button text' ||
      name === 'start button text') {
      return true;
    }

    return false;
  }, []);

  /**
   * Gets the button text for the current module
   * @param module - Current module or undefined
   * @returns Button text to display
   */
  const getButtonText = useCallback((module: Module | undefined): string => {
    if (!module) {
      return 'Guardar y continuar';
    }

    // For Welcome Screen, use the start_button_text component value
    if (module.name === 'Welcome Screen') {
      // Removed excessive logging for production

      const startButtonComponent = module.structure?.components?.find((comp) => isStartButtonComponent(comp));

      // Removed excessive logging for production

      if (startButtonComponent) {
        // Try to get value from component.value, component.defaultValue, or component.settings.defaultValue
        let buttonText = getComponentText(startButtonComponent);
        // Removed excessive logging for production

        // If getComponentText doesn't return a value, try other sources
        if (!buttonText || buttonText.trim().length === 0) {
          if (typeof startButtonComponent.value === 'string' && startButtonComponent.value.trim().length > 0) {
            buttonText = startButtonComponent.value;
            // Removed excessive logging for production
          } else if (typeof startButtonComponent.defaultValue === 'string' && startButtonComponent.defaultValue.trim().length > 0) {
            buttonText = startButtonComponent.defaultValue;
            // Removed excessive logging for production
          } else if (typeof startButtonComponent.settings?.defaultValue === 'string' && startButtonComponent.settings.defaultValue.trim().length > 0) {
            buttonText = startButtonComponent.settings.defaultValue;
            // Removed excessive logging for production
          }
        }

        // Removed excessive logging for production

        if (buttonText && buttonText.trim().length > 0) {
          return buttonText;
        }
      } else {
        // Removed excessive logging for production
      }
    }

    // Default text
    return 'Guardar y continuar';
  }, [isStartButtonComponent]);

  /**
   * Determines if the "Guardar y continuar" button should be shown for the current module
   * @param module - Current module or undefined
   * @returns true if button should be shown, false otherwise
   */
  const shouldShowButton = useCallback((module: Module | undefined): boolean => {
    if (!module) {
      return true; // Default: show button
    }

    const moduleName = module.name || '';

    // Hide button for modules that auto-advance
    // Linear Scale modules (CSAT, CES, CV, NPS, Linear Scale) - auto-advance on selection
    if (
      moduleName.includes('CSAT') ||
      moduleName.includes('CES') ||
      moduleName.includes('CV') ||
      moduleName.includes('NPS') ||
      moduleName === 'Linear Scale'
    ) {
      return false;
    }

    // Navigation Flow - auto-advances when flow completes
    if (moduleName === 'Navigation Flow') {
      return false;
    }

    // NEV - auto-advances when required emotions are selected
    if (moduleName.includes('NEV') || moduleName.includes('Net Emotional Value')) {
      return false;
    }

    // Preference Test - auto-advances when image is selected
    if (moduleName === 'Preference Test') {
      return false;
    }

    // Show button for Multiple Choice and other modules that require explicit confirmation
    return true;
  }, []);

  const handleNext = useCallback(async () => {
    // Handle restart option for multiple sessions
    if (showRestartOption && currentStep === 'thank-you') {
      // Start a new session
      startNewSession();
      clearAllResponses();
      // Clear Turnstile token to force re-verification
      useSessionStore.getState().clearTurnstileToken();
      // Reset to first step
      useParticipantStore.getState().setCurrentStep('welcome');
      setShowRestartOption(false);
      return;
    }

    // Verify Turnstile token on welcome step (only in participant mode)
    if (currentStep === 'welcome' && !isPreviewMode) {
      const { turnstileVerified, turnstileToken } = useSessionStore.getState();
      if (!turnstileVerified || !turnstileToken) {
        alert('Por favor, completa la verificación de seguridad antes de continuar.');
        return;
      }
    }

    // In preview mode, don't send data to backend
    if (isPreviewMode) {
      // Removed excessive logging for production
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
      // Verify Turnstile token before submitting (required for anti-bot protection)
      const { turnstileToken, turnstileVerified } = useSessionStore.getState();
      if (!turnstileVerified || !turnstileToken) {
        alert('La verificación de seguridad es requerida. Por favor, recarga la página y completa la verificación.');
        return;
      }

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
          // Removed excessive logging for production

          await responseService.submitModuleResponses(researchId, participantId, {
            participantId,
            moduleId: currentModule.id,
            responses: moduleResponses,
            metadata: {
              completedAt: Date.now(),
              turnstileToken,
              isPreviewMode: false,
            },
          });

          // Removed excessive logging for production
        } catch (error: unknown) {
          console.error('Error submitting responses:', error);

          // Check if error is related to Turnstile verification
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          if (errorMessage.includes('verification') || errorMessage.includes('Anti-bot') || errorMessage.includes('security')) {
            alert('Error de verificación de seguridad. Por favor, recarga la página y completa la verificación nuevamente.');
            // Clear token to force re-verification
            useSessionStore.getState().clearTurnstileToken();
          } else {
            alert('Error al guardar respuestas. Por favor, intenta nuevamente.');
          }

          setSubmitting(false);
          return;
        } finally {
          setSubmitting(false);
        }
      } else {
        // Removed excessive logging for production
      }
    }

    // Navigate to next step
    const result = goNext();
    if (!result.success && result.errors) {
      const errorMessage = result.errors.map(e => e.message).join('\n');
      alert(errorMessage);
    }

    // Check if we've reached the thank-you page
    if (result.success && currentStep === 'thank-you') {
      // Priority 1: Redirect if "Common Complete" link is configured
      if (backlinks.complete) {
        window.location.href = backlinks.complete;
        return;
      }

      // Priority 2: Show restart option if multiple sessions are allowed
      const linkConfig = useSessionStore.getState().config?.linkConfig;
      if (linkConfig?.allowMultiple === true) {
        setShowRestartOption(true);
      }
    }
  }, [isPreviewMode, participantId, researchId, currentModule, getResponsesByModule, goNext, showRestartOption, startNewSession, clearAllResponses, currentStep]);

  if (!researchId) {
    return <InvalidResearchScreen />;
  }

  // Show mobile restriction message
  if (mobileRestriction) {
    return <MobileRestrictionScreen message={mobileRestriction} />;
  }

  // Show loading state
  if (loading) {
    return <LoadingScreen />;
  }

  // Show error state
  if (error) {
    return <ErrorScreen message={error} onRetry={() => window.location.reload()} />;
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
          shouldShowButton(currentModule) && !showRestartOption ? (
            <Button
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting
                ? 'Guardando...'
                : isLastStep
                  ? 'Finalizar'
                  : getButtonText(currentModule)}
            </Button>
          ) : showRestartOption ? (
            <Button
              onClick={handleNext}
              disabled={submitting}
            >
              Comenzar de nuevo
            </Button>
          ) : null
        }
      >
        {currentModule && currentStep === 'welcome' ? (
          <WelcomeStep
            title={getComponentText(currentModule.structure.components?.find(c => c.id?.includes('title')))}
            message={getComponentText(currentModule.structure.components?.find(c => c.id?.includes('message')))}
          />
        ) : currentModule && currentModule.id !== 'demographics' ? (
          <DynamicStep module={currentModule} onComplete={handleNext} />
        ) : currentModule && currentModule.id === 'demographics' ? (
          <DemographicsStep module={currentModule} onComplete={handleNext} />
        ) : showRestartOption ? (
          <ResearchCompletionContent showRestartOption={showRestartOption} />
        ) : (
          <UnconfiguredStepContent currentStep={currentStep} />
        )}
      </MainLayout>
    </>
  );
};