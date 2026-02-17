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

// Turnstile temporarily disabled - will be re-enabled when TURNSTILE_SECRET_KEY is configured
const TURNSTILE_ENABLED = false;

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
 * Determines whether a module has been configured with content from research-frontend.
 * Modules that only have default template values are considered not configured.
 * @param module - Module payload from backend
 * @returns true when module has configured content
 */
const isModuleConfigured = (module: Module): boolean => {
  // Welcome and Thank You screens are always considered configured if they exist
  if (module.name === 'Welcome Screen' || module.name === 'Thank You Screen' || module.name === 'Thank you screen') {
    return true;
  }

  // Research Configuration is not shown to participants
  if (module.name === 'Research Configuration') {
    return false;
  }

  const components = module.structure?.components || [];

  // For Navigation Flow: requires file-upload component with images
  if (module.name === 'Navigation Flow') {
    const fileUploadComponent = components.find(c => c.type === 'file-upload');
    if (!fileUploadComponent) return false;
    
    // Check if file-upload has value (images uploaded)
    if (fileUploadComponent.value) {
      try {
        const parsed = typeof fileUploadComponent.value === 'string' 
          ? JSON.parse(fileUploadComponent.value) 
          : fileUploadComponent.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if at least one image has s3Key or url
          const hasValidImage = parsed.some((img: unknown) => {
            if (typeof img === 'object' && img !== null) {
              const imgObj = img as { s3Key?: string; url?: string };
              return Boolean(imgObj.s3Key || imgObj.url);
            }
            return false;
          });
          return hasValidImage;
        }
      } catch {
        // Invalid JSON, consider not configured
      }
    }
    return false;
  }

  // For Preference Test: requires file-upload component with images
  if (module.name === 'Preference Test') {
    const fileUploadComponent = components.find(c => c.type === 'file-upload');
    if (!fileUploadComponent) return false;
    
    // Check if file-upload has value (images uploaded)
    if (fileUploadComponent.value) {
      try {
        const parsed = typeof fileUploadComponent.value === 'string' 
          ? JSON.parse(fileUploadComponent.value) 
          : fileUploadComponent.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if at least one image has s3Key or url
          const hasValidImage = parsed.some((img: unknown) => {
            if (typeof img === 'object' && img !== null) {
              const imgObj = img as { s3Key?: string; url?: string };
              return Boolean(imgObj.s3Key || imgObj.url);
            }
            return false;
          });
          return hasValidImage;
        }
      } catch {
        // Invalid JSON, consider not configured
      }
    }
    return false;
  }

  // For Ranking: requires items component with items configured
  if (module.name === 'Ranking') {
    const itemsComponent = components.find(c => 
      c.id === 'items' || (c.id === 'ranking-slider' && c.type === 'select')
    );
    if (!itemsComponent) return false;
    
    // Check if items component has value with actual items
    if (itemsComponent.value) {
      try {
        const parsed = typeof itemsComponent.value === 'string' 
          ? JSON.parse(itemsComponent.value) 
          : itemsComponent.value;
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if items have labels (not just default template values)
          const hasConfiguredItems = parsed.some((item: unknown) => {
            if (typeof item === 'object' && item !== null) {
              const itemObj = item as { label?: string; id?: string };
              return Boolean(itemObj.label && itemObj.label.trim() && itemObj.label !== 'Item 1' && itemObj.label !== 'Item 2' && itemObj.label !== 'Item 3');
            }
            return false;
          });
          return hasConfiguredItems;
        }
      } catch {
        // Invalid JSON, check if it's a string with content
        if (typeof itemsComponent.value === 'string' && itemsComponent.value.trim().length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  // For other Cognitive Tasks: require at least title or description configured
  const cognitiveTaskNames = ['Short Text', 'Long Text', 'Single Choice', 'Multiple Choice', 'Linear Scale'];
  if (cognitiveTaskNames.includes(module.name)) {
    const titleComponent = components.find(c => c.id.includes('title') || c.id.includes('question-title'));
    const descriptionComponent = components.find(c => c.id.includes('description') || c.id.includes('question-description'));
    
    // Check if title has configured value (not just empty or default)
    const hasTitle: boolean = Boolean(
      titleComponent && 
      titleComponent.value && 
      typeof titleComponent.value === 'string' && 
      titleComponent.value.trim().length > 0
    );
    
    // Check if description has configured value
    const hasDescription: boolean = Boolean(
      descriptionComponent && 
      descriptionComponent.value && 
      typeof descriptionComponent.value === 'string' && 
      descriptionComponent.value.trim().length > 0
    );
    
    // For choice questions, also check if choices are configured
    if (module.name === 'Single Choice' || module.name === 'Multiple Choice') {
      const choiceComponents = components.filter(c => c.settings?.isChoice || c.id.includes('choice-'));
      const hasConfiguredChoices = choiceComponents.some((c): boolean => {
        const text = getComponentText(c);
        return Boolean(text && text.trim().length > 0);
      });
      return hasTitle || hasDescription || hasConfiguredChoices;
    }
    
    return hasTitle || hasDescription;
  }

  // For SmartVOC modules, always consider configured if they exist
  // (they typically have default configurations)
  const smartVOCNames = ['CSAT', 'NPS', 'CES', 'CV', 'NEV', 'VOC'];
  if (smartVOCNames.some(name => module.name.includes(name))) {
    return true;
  }

  // Default: consider configured if module exists
  // (for unknown module types, show them to avoid breaking the flow)
  return true;
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

    // If we have a new participant (different from stored or no stored ID)
    // we need to reset the session to start from the beginning
    if (!storedParticipantId || storedParticipantId !== participantId) {
      console.log('[ResearchPage] New or changed participant, resetting session');
      clearAllResponses();
      // Clear Turnstile token, but if Turnstile is disabled, auto-verify immediately
      useSessionStore.getState().clearTurnstileToken();
      if (!TURNSTILE_ENABLED) {
        useSessionStore.getState().setTurnstileToken('disabled');
      }
      startNewSession();
      // Reset to the first step (welcome)
      useParticipantStore.getState().setCurrentStep('welcome');
    }

    // Always update to current participant ID
    useParticipantStore.getState().setParticipantId(participantId);
  }, [participantId, clearAllResponses, startNewSession]);

  // Initialize session timer
  useSessionTimer();

  // Auto-initialize Turnstile when disabled
  useEffect(() => {
    if (!TURNSTILE_ENABLED) {
      const { turnstileVerified, turnstileToken } = useSessionStore.getState();
      if (!turnstileVerified || !turnstileToken) {
        useSessionStore.getState().setTurnstileToken('disabled');
      }
    }
  }, []);

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
        const research = await publicService.getResearch(researchId, isPreviewMode);
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

        // Track if welcome screen is configured
        stages.forEach(stage => {
          const modules = stage.modules || [];
          modules.forEach(module => {
            try {
              const normalizedModule = normalizeModule(module);
              
              // Debug: Log Ranking module structure from API
              if (normalizedModule.name === 'Ranking' && normalizedModule.id === '1ff3e347-85bb-47fb-8fa6-fdfeb8fff37b') {
                console.log('[ResearchPage] Ranking module from API:', {
                  id: normalizedModule.id,
                  name: normalizedModule.name,
                  description: normalizedModule.description,
                  structure: normalizedModule.structure,
                  config: normalizedModule.config,
                  rawModule: module,
                  components: normalizedModule.structure.components.map(c => ({
                    id: c.id,
                    type: c.type,
                    label: c.label,
                    value: c.value,
                    options: c.options,
                    settings: c.settings,
                    defaultValue: c.defaultValue
                  }))
                });
              }
              
              if (isModuleHidden(normalizedModule)) return;
              if (!isModuleConfigured(normalizedModule)) return;
              const stepId = getStepIdFromModuleName(normalizedModule.name);
              if (!stepId) return;
              modulesMap[stepId] = normalizedModule;
            } catch (error: unknown) {
              console.error('Error normalizing module:', error, module);
            }
          });
        });

        // If no Welcome Screen is configured, skip welcome step
        // (Turnstile verification is now disabled, so no need for virtual welcome)

        setModules(modulesMap);

        // Determine the first available step and set it as current
        const STEPS_ORDER = [
          'welcome', 'demographics',
          'csat', 'nps', 'ces', 'cv', 'nev', 'voc',
          'short-text', 'long-text', 'single-choice', 'multiple-choice',
          'linear-scale', 'ranking', 'navigation-flow', 'preference-test',
          'thank-you'
        ];
        const enabledSteps = STEPS_ORDER.filter((stepId) => Boolean(modulesMap[stepId]));
        // If no steps are enabled, default to welcome (shouldn't happen, but safety check)
        const firstStep = enabledSteps.length > 0 ? enabledSteps[0] : 'welcome';

        // In preview mode, always reset to the first step
        // In participant mode, only reset if user hasn't progressed yet
        const storedStep = useParticipantStore.getState().currentStep;
        if (isPreviewMode || !storedStep || storedStep === 'welcome' || !enabledSteps.includes(storedStep)) {
          useParticipantStore.getState().setCurrentStep(firstStep);
        }

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
          backlinks: researchBacklinks,
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
  }, [researchId, setConfig, isPreviewMode]);

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

    // Single Choice - auto-advances when option is selected
    if (moduleName === 'Single Choice') {
      return false;
    }

    // Thank You Screen - final step, no button needed
    if (moduleName === 'Thank You Screen' || moduleName === 'Thank you screen') {
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
      // If Turnstile is disabled, auto-verify immediately
      if (!TURNSTILE_ENABLED) {
        useSessionStore.getState().setTurnstileToken('disabled');
      }
      // Reset to first step
      useParticipantStore.getState().setCurrentStep('welcome');
      setShowRestartOption(false);
      return;
    }

    // Verify Turnstile token on welcome step (only in participant mode)
    // Note: TURNSTILE_ENABLED is defined at module level
    if (TURNSTILE_ENABLED && currentStep === 'welcome' && !isPreviewMode) {
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
      // Note: TURNSTILE_ENABLED is defined at module level
      // Skip verification in development (localhost) or if using test site key
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const { turnstileToken, turnstileVerified, turnstileTokenUsed } = useSessionStore.getState();
      const { turnstileVerifiedAt } = useParticipantStore.getState();

      // Check if participant was already verified (persisted from previous session)
      const wasAlreadyVerified = turnstileVerifiedAt !== null;

      // Only require token verification if Turnstile is enabled and not already verified
      if (TURNSTILE_ENABLED && !isDevelopment && !turnstileTokenUsed && !wasAlreadyVerified && (!turnstileVerified || !turnstileToken)) {
        alert('La verificación de seguridad es requerida. Por favor, recarga la página y completa la verificación.');
        return;
      }

      // Only send token if Turnstile is enabled and it hasn't been used yet
      // After first use or if previously verified, send null to indicate already verified
      const finalToken = TURNSTILE_ENABLED
        ? ((turnstileTokenUsed || wasAlreadyVerified)
          ? null
          : (isDevelopment && (!turnstileToken || !turnstileVerified)
            ? 'dev-mock-token'
            : turnstileToken))
        : null; // Don't send token when Turnstile is disabled

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
              turnstileToken: finalToken,
              isPreviewMode: false,
            },
          });

          // Mark token as used after first successful submission
          // Turnstile tokens are single-use, so we don't send it again
          if (!turnstileTokenUsed && finalToken) {
            useSessionStore.getState().markTurnstileTokenUsed();
            // Also persist verification in participant store for future sessions
            useParticipantStore.getState().setTurnstileVerified();
          }
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
  }, [isPreviewMode, participantId, researchId, currentModule, getResponsesByModule, goNext, showRestartOption, startNewSession, clearAllResponses, currentStep, backlinks.complete]);

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
      {/* Development Sidebar — also visible in preview mode for researchers */}
      {(isDev || isPreviewMode) && (
        <DevSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          modules={modules}
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