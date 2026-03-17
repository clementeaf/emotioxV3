import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { LanguageSelector } from '../components/ui/LanguageSelector';
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
import { mediaService } from '../services/media.service';
import { queryClient } from '../providers/QueryProvider';
import type { ModuleStructure, ModuleComponent } from '../types/module';

/** Delay in ms before kiosk auto-resets to welcome for next participant */
const KIOSK_TRANSITION_DELAY = 4000;

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
  const { t } = useTranslation();
  const { researchId } = useParams<{ researchId: string }>();
  const { isPreviewMode, participantId } = usePreviewMode();
  const { setConfig } = useSessionStore();
  const { getResponsesByModule, startNewSession, clearAllResponses } = useParticipantStore();
  const [modules, setModules] = useState<Record<string, Module>>({});

  // Build demographic responses map for conditionality filtering.
  // We serialize to a JSON key so the memo only updates when actual values change.
  const _demoResponsesJson = useParticipantStore((state) => {
    const map: Record<string, string> = {};
    state.responses.forEach((r) => {
      if (r.moduleId === 'demographics' && typeof r.value === 'string') {
        map[r.componentId] = r.value;
      }
    });
    return JSON.stringify(map);
  });
  const demographicResponses: Record<string, string> = useMemo(
    () => JSON.parse(_demoResponsesJson) as Record<string, string>,
    [_demoResponsesJson]
  );

  // Build module responses map for module-based conditionality filtering.
  const _moduleResponsesJson = useParticipantStore((state) => {
    const map: Record<string, { value: string | number | boolean | string[] | number[] | null }> = {};
    state.responses.forEach((r) => {
      if (r.moduleId !== 'demographics') {
        map[`${r.moduleId}_${r.componentId}`] = { value: r.value };
      }
    });
    return JSON.stringify(map);
  });
  const moduleResponses = useMemo(() => {
    const parsed = JSON.parse(_moduleResponsesJson) as Record<string, { value: string | number | boolean | string[] | number[] | null }>;
    return new Map(Object.entries(parsed));
  }, [_moduleResponsesJson]);

  const { currentStep, goNext, isLastStep } = useNavigation(modules, demographicResponses, moduleResponses);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mobileRestriction, setMobileRestriction] = useState<string | null>(null);
  const [showRestartOption, setShowRestartOption] = useState(false);
  const [kioskTransition, setKioskTransition] = useState(false);
  const kioskTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Prevents scheduling multiple kiosk reset timeouts (Safari re-renders can trigger effect repeatedly) */
  const kioskResetScheduledRef = useRef(false);
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
      // Flush caches to prevent memory buildup across participant sessions
      mediaService.clearCache();
      queryClient.clear();
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

  // Cleanup kiosk timer on unmount
  useEffect(() => {
    return () => {
      if (kioskTimerRef.current) clearTimeout(kioskTimerRef.current);
    };
  }, []);

  // Kiosk auto-reset: when currentStep becomes 'thank-you' in kiosk mode,
  // show transition screen then reset for next participant.
  // Only schedule once per thank-you visit (ref guard) to avoid loop in Safari where effect re-runs each render.
  const participationMode = useParticipantStore((state) => state.participationMode);
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

  // Load research configuration
  useEffect(() => {
    if (!researchId) return;

    const loadResearch = async () => {
      try {
        setLoading(true);
        setError(null);
        setMobileRestriction(null);
        setShowRestartOption(false);

        // Step 1: Detect participation mode (before anything else)
        const mode = await publicService.getParticipationMode(researchId);
        useParticipantStore.getState().setParticipationMode(mode);

        // Step 2: Determine effective preview mode locally
        // (can't rely on hook value — mode was just set, re-render hasn't happened yet)
        const urlParticipantId = new URLSearchParams(window.location.search).get('participantId') ?? new URLSearchParams(window.location.search).get('participantid');
        const explicitPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        const effectivePreview = explicitPreview || (!urlParticipantId && mode !== 'kiosk');

        // Step 3: If kiosk mode, always request a fresh session
        // (ensures correct research context even if localStorage has stale kiosk ID from another research)
        if (mode === 'kiosk' && !urlParticipantId && !explicitPreview) {
          const kioskId = await publicService.requestKioskSession(researchId);
          useParticipantStore.getState().setParticipantId(kioskId);
          useParticipantStore.getState().clearAllResponses();
          startNewSession();
          useParticipantStore.getState().setCurrentStep('welcome');
        }

        // Fetch research data from backend
        const research = await publicService.getResearch(researchId, effectivePreview);

        // Check mobile device restriction
        const linkConfig = getLinkConfig(research);

        // Get device info from session store
        const deviceType = useSessionStore.getState().deviceInfo?.deviceType;

        // If mobile devices are not allowed and user is on mobile/tablet
        if (linkConfig.allowMobile === false && deviceType && (deviceType === 'mobile' || deviceType === 'tablet')) {
          setMobileRestriction(t('mobileRestriction.message'));
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

        // In preview mode, always reset to the first step and clear previous responses
        // In participant mode, only reset if user hasn't progressed yet
        const storedStep = useParticipantStore.getState().currentStep;
        if (effectivePreview) {
          useParticipantStore.getState().clearAllResponses();
          useParticipantStore.getState().setCurrentStep(firstStep);
        } else if (!storedStep || storedStep === 'welcome' || !enabledSteps.includes(storedStep)) {
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
        setError(t('errors.failedToLoadResearch'));
      } finally {
        setLoading(false);
      }
    };

    void loadResearch();
  }, [researchId, setConfig, startNewSession, t]);

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
      return t('common.saveAndContinue');
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
    return t('common.saveAndContinue');
  }, [isStartButtonComponent, t]);

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

    // SmartVOC scale modules (CSAT, CES, CV, NPS) — auto-advance, no button
    if (
      moduleName.includes('CSAT') ||
      moduleName.includes('CES') ||
      moduleName.includes('CV') ||
      moduleName.includes('NPS')
    ) {
      return false;
    }

    // Navigation Flow - internal completion handling
    if (moduleName === 'Navigation Flow') {
      return false;
    }

    // NEV - uses parent footer button (no auto-advance)
    // (removed from exclusion list so parent button shows)

    // Preference Test - uses parent footer button (no internal Continue)
    // (removed from exclusion list so parent button shows)

    // Single Choice - uses parent footer button (no internal Continue)
    // (removed from exclusion list so parent button shows)

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
      mediaService.clearCache();
      queryClient.clear();
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

    // Demographics server-side validation (quota & disqualification)
    // Only skip for explicit preview (?preview=true). Participants without ?participantId
    // were incorrectly treated as preview, skipping demographic persistence.
    const isExplicitPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
    if (currentStep === 'demographics' && !isExplicitPreview) {
      const demoResponses = useParticipantStore.getState().responses;
      const demoAnswers: Record<string, string> = {};
      demoResponses.forEach((r) => {
        if (r.moduleId === 'demographics' && typeof r.value === 'string') {
          demoAnswers[r.componentId] = r.value;
        }
      });

      // Check that at least one answer exists
      if (Object.keys(demoAnswers).length === 0) {
        alert(t('errors.answerDemographics'));
        return;
      }

      try {
        setSubmitting(true);
        const match = window.location.pathname.match(/\/research\/([^/]+)/);
        const rid = match?.[1] ?? researchId;
        if (rid) {
          // Use participantId from URL/hook, or from store (kiosk), or generate a temporary one
          const effectivePid = participantId
            ?? useParticipantStore.getState().participantId
            ?? `anon-${Date.now()}`;
          const result = await publicService.validateDemographics(rid, demoAnswers, effectivePid);
          if (!result.valid) {
            const bl = backlinks;
            if (result.reason === 'QUOTA_FULL') {
              if (bl.overquota) { window.location.href = bl.overquota; return; }
              alert(t('errors.quotaFull'));
            } else {
              if (bl.disqualified) { window.location.href = bl.disqualified; return; }
              alert(t('errors.disqualified'));
            }
            setSubmitting(false);
            return;
          }
        }
      } catch {
        alert(t('errors.validationError'));
        setSubmitting(false);
        return;
      } finally {
        setSubmitting(false);
      }
    }

    // Verify Turnstile token on welcome step (only in participant mode)
    // Note: TURNSTILE_ENABLED is defined at module level
    if (TURNSTILE_ENABLED && currentStep === 'welcome' && !isPreviewMode) {
      const { turnstileVerified, turnstileToken } = useSessionStore.getState();
      if (!turnstileVerified || !turnstileToken) {
        alert(t('errors.completeSecurityVerification'));
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
        alert(t('errors.securityRequired'));
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
          const errorMessage = error instanceof Error ? error.message : t('errors.unknownError');
          if (errorMessage.includes('verification') || errorMessage.includes('Anti-bot') || errorMessage.includes('security')) {
            alert(t('errors.securityVerificationError'));
            // Clear token to force re-verification
            useSessionStore.getState().clearTurnstileToken();
          } else {
            alert(t('errors.saveResponsesError'));
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

    // Check if we've reached the thank-you page (restart button on thank-you)
    if (result.success && currentStep === 'thank-you') {
      // Redirect if "Common Complete" link is configured
      if (backlinks.complete) {
        window.location.href = backlinks.complete;
        return;
      }

      // Show restart option if multiple sessions are allowed (panel mode only — kiosk uses auto-reset effect)
      const linkConfig = useSessionStore.getState().config?.linkConfig;
      if (linkConfig?.allowMultiple === true) {
        setShowRestartOption(true);
      }
    }
  }, [isPreviewMode, participantId, researchId, currentModule, getResponsesByModule, goNext, showRestartOption, startNewSession, clearAllResponses, currentStep, backlinks, t]);

  // Enter key → "Guardar y continuar" (accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      // Don't intercept Enter inside textareas (Long Text needs newlines)
      if (e.target instanceof HTMLTextAreaElement) return;
      // Only when the footer button is visible and not submitting
      if (!shouldShowButton(currentModule) && !showRestartOption) return;
      if (submitting) return;
      e.preventDefault();
      handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentModule, showRestartOption, submitting, shouldShowButton, handleNext]);

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

  // Show kiosk transition screen (between participants)
  if (kioskTransition) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 px-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('kiosk.transitionTitle')}</h1>
          <p className="text-gray-600">{t('kiosk.transitionMessage')}</p>
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      {/* Development Sidebar — also visible in preview mode for researchers */}
      {(isDev || isPreviewMode) && (
        <DevSidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          modules={modules}
          isPreviewMode={isPreviewMode}
        />
      )}

      {/* Preview Mode Banner */}
      {isPreviewMode && <PreviewModeBanner />}

      <LanguageSelector />

      <MainLayout
        footer={
          shouldShowButton(currentModule) && !showRestartOption ? (
            <Button
              onClick={handleNext}
              disabled={submitting}
            >
              {submitting
                ? t('common.saving')
                : isLastStep
                  ? t('common.finish')
                  : getButtonText(currentModule)}
            </Button>
          ) : showRestartOption ? (
            <Button
              onClick={handleNext}
              disabled={submitting}
            >
              {t('common.startOver')}
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