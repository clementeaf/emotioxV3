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
import { publicService, type Module } from '../services/public.service';
import { responseService } from '../services/response.service';
import { getComponentText } from '../utils/moduleComponent';
import { mediaService } from '../services/media.service';
import { queryClient } from '../providers/queryClient';
import { isRecord, isModuleHidden, isModuleConfigured, getLinkConfig, getBacklinks, getDemographicsConfig, getStudyLogo, getStepIdFromModuleName, normalizeModule } from '../utils/researchPageHelpers';

/** Delay in ms before kiosk auto-resets to welcome for next participant */
const KIOSK_TRANSITION_DELAY = 4000;

// Turnstile temporarily disabled - will be re-enabled when TURNSTILE_SECRET_KEY is configured
const TURNSTILE_ENABLED = false;


export const ResearchPage = () => {
  const { t } = useTranslation();
  const { researchId } = useParams<{ researchId: string }>();
  const { isPreviewMode, isReviewMode, reviewParticipantId, participantId } = usePreviewMode();
  const { setConfig } = useSessionStore();
  const allowLanguageSwitch = useSessionStore((s) => s.config?.linkConfig?.allowLanguageSwitch);
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

  const [stepsOrder, setStepsOrder] = useState<string[]>([]);
  const { currentStep, goNext, isLastStep } = useNavigation(modules, demographicResponses, moduleResponses, stepsOrder);
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
  const [alreadyResponded, setAlreadyResponded] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [studyLogoUrl, setStudyLogoUrl] = useState<string | null>(null);
  const [studyLogoEnabled, setStudyLogoEnabled] = useState(true);

  /** Show redirect screen briefly, then navigate.
   *  - Replaces `@id` placeholder with the real participant ID.
   *  - Ensures the URL has a protocol so the browser treats it as absolute. */
  const redirectTo = useCallback((rawUrl: string) => {
    let url = rawUrl.trim();
    // Replace @id placeholder with actual participant ID
    if (participantId) {
      url = url.replace(/@id/gi, encodeURIComponent(participantId));
    }
    // Ensure absolute URL — add https:// if no protocol present
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setRedirecting(true);
    setTimeout(() => { window.location.href = url; }, 1500);
  }, [participantId]);

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

  // Auto-redirect on thank-you for non-kiosk modes (panel / anonymous)
  // Kiosk has its own auto-reset above; preview never redirects.
  useEffect(() => {
    if (currentStep !== 'thank-you' || isPreviewMode || participationMode === 'kiosk') return;

    if (backlinks.complete) {
      redirectTo(backlinks.complete);
      return;
    }

    const linkConfig = useSessionStore.getState().config?.linkConfig;
    if (linkConfig?.allowMultiple === true) {
      setShowRestartOption(true);
    }
  }, [currentStep, isPreviewMode, participationMode, backlinks, redirectTo]);

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
        const params = new URLSearchParams(window.location.search);
        const urlParticipantId = params.get('participantId') ?? params.get('participantid') ?? params.get('ECX') ?? params.get('ecx');
        const explicitPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
        const reviewParam = params.get('review');
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

        // Panel with ECX/participantId: block repeat submissions and avoid stale persisted thank-you / redirect race
        if (urlParticipantId && !effectivePreview && !reviewParam) {
          const { hasResponded } = await publicService.getParticipantStatus(researchId, urlParticipantId);
          if (hasResponded) {
            setAlreadyResponded(true);
            setModules({});
            setStepsOrder([]);
            setLoading(false);
            return;
          }
        }

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

        // Resolve study logo
        const logoConfig = getStudyLogo(research);
        if (logoConfig) {
          setStudyLogoEnabled(logoConfig.enabled);
          if (logoConfig.enabled && logoConfig.s3Key) {
            mediaService.getMediaUrl(logoConfig.s3Key).then(url => setStudyLogoUrl(url)).catch(() => setStudyLogoUrl(null));
          }
        }

        // Pre-check: are all quota slots exhausted? If so, redirect before demographics
        if (!effectivePreview) {
          try {
            const quotaStatus = await publicService.checkQuotaAvailability(researchId);
            if (!quotaStatus.available) {
              if (researchBacklinks.overquota) {
                redirectTo(researchBacklinks.overquota);
                return;
              }
              // No backlink configured — show message and stop
              setMobileRestriction(t('errors.quotaFull', 'This survey has reached its participant limit for your profile.'));
              setModules({});
              setLoading(false);
              return;
            }
          } catch {
            // Don't block participant if pre-check fails
            console.warn('Quota pre-check failed, continuing normally');
          }
        }

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

        // Build dynamic steps order: stages first (order_index), then modules within each stage.
        // Do not sort all modules by module order_index globally — that interleaves different stages
        // (e.g. Implicit Association + Cognitive Tasks) when order_index is scoped per-stage.
        const dynamicOrder: string[] = [];

        const sortedStages = [...stages].sort(
          (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
        );

        const allModules: Array<{ module: unknown }> = [];
        for (const stage of sortedStages) {
          const mods = stage.modules || [];
          const sortedMods = [...mods].sort((a, b) => {
            const oi = (m: unknown): number =>
              isRecord(m) && typeof (m as Record<string, unknown>).order_index === 'number'
                ? ((m as Record<string, unknown>).order_index as number)
                : 0;
            return oi(a) - oi(b);
          });
          for (const mod of sortedMods) {
            allModules.push({ module: mod });
          }
        }

        allModules.forEach(({ module }) => {
          try {
            const normalizedModule = normalizeModule(module);
            if (isModuleHidden(normalizedModule)) return;
            if (!isModuleConfigured(normalizedModule)) return;
            const nameBasedId = getStepIdFromModuleName(normalizedModule.name);
            if (!nameBasedId) return;
            // Special steps (welcome, demographics, thank-you) keep their fixed stepId.
            // All other modules use their unique module.id so duplicates don't collide.
            const isSpecial = nameBasedId === 'welcome' || nameBasedId === 'demographics' || nameBasedId === 'thank-you' || nameBasedId === 'screener';
            const stepId = isSpecial ? nameBasedId : normalizedModule.id;
            modulesMap[stepId] = normalizedModule;
            if (!dynamicOrder.includes(stepId)) {
              dynamicOrder.push(stepId);
            }
          } catch (err: unknown) {
            console.error('Error normalizing module:', err, module);
          }
        });

        // Ensure welcome is first, screener before demographics, thank-you last
        const orderedSteps: string[] = [];
        if (dynamicOrder.includes('welcome')) orderedSteps.push('welcome');
        if (dynamicOrder.includes('screener')) orderedSteps.push('screener');
        if (dynamicOrder.includes('demographics') || modulesMap['demographics']) orderedSteps.push('demographics');
        // Add all non-special steps in stage order, then module order within each stage
        dynamicOrder.forEach(s => {
          if (s !== 'welcome' && s !== 'demographics' && s !== 'thank-you' && s !== 'screener') {
            orderedSteps.push(s);
          }
        });
        if (dynamicOrder.includes('thank-you')) orderedSteps.push('thank-you');

        setModules(modulesMap);
        setStepsOrder(orderedSteps);

        const enabledSteps = orderedSteps.filter((stepId) => Boolean(modulesMap[stepId]));
        // If no steps are enabled, default to welcome (shouldn't happen, but safety check)
        const firstStep = enabledSteps.length > 0 ? enabledSteps[0] : 'welcome';

        // In preview mode, always reset to the first step and clear previous responses
        // In review mode, don't clear — responses are loaded separately
        // In participant mode, only reset if user hasn't progressed yet
        const storedStep = useParticipantStore.getState().currentStep;
        if (effectivePreview && !reviewParam) {
          useParticipantStore.getState().clearAllResponses();
          useParticipantStore.getState().setCurrentStep(firstStep);
        } else if (!storedStep || storedStep === 'welcome' || !enabledSteps.includes(storedStep)) {
          useParticipantStore.getState().setCurrentStep(firstStep);
        } else if (
          urlParticipantId &&
          !effectivePreview &&
          !reviewParam &&
          storedStep === 'thank-you'
        ) {
          // Persisted thank-you from a prior session without completed responses — restart flow
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

        // Review mode: load participant responses after modules are ready
        if (reviewParam) {
          try {
            const responses = await publicService.getParticipantResponses(researchId, reviewParam);
            for (const r of responses) {
              let parsedValue: unknown = r.value;
              if (typeof parsedValue === 'string') {
                try { parsedValue = JSON.parse(parsedValue); } catch { /* keep as string */ }
              }
              useParticipantStore.getState().saveResponse(r.module_id, r.component_id, parsedValue as import('../types/responses').ResponseValue);
            }
            useParticipantStore.getState().setCurrentStep(firstStep);
          } catch (err) {
            console.error('[ReviewMode] Failed to load responses:', err);
          }
        }

      } catch (err: unknown) {
        console.error('Failed to load research:', err);
        const errMsg = err instanceof Error ? err.message : '';
        // Research is completed/closed — show specific blocking screen
        if (errMsg.includes('not active') || errMsg.includes('404')) {
          setMobileRestriction(t('errors.researchClosed', 'This survey is no longer accepting responses.'));
        } else {
          setError(t('errors.failedToLoadResearch'));
        }
      } finally {
        setLoading(false);
      }
    };

    void loadResearch();
  }, [researchId, setConfig, startNewSession, t, redirectTo]);

  // Check if we're in development mode
  const isDev = useMemo(() => import.meta.env.DEV, []);

  // Get current module
  const currentModule = useMemo(() => modules[currentStep], [modules, currentStep]);

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

  const getButtonText = useCallback((module: Module | undefined): string => {
    if (!module) {
      return t('common.saveAndContinue');
    }

    // For Welcome Screen, use the start_button_text component value
    if (module.name === 'Welcome Screen') {
      const startButtonComponent = module.structure?.components?.find((comp) => isStartButtonComponent(comp));

      if (startButtonComponent) {
        let buttonText = getComponentText(startButtonComponent);

        // If getComponentText doesn't return a value, try other sources
        if (!buttonText || buttonText.trim().length === 0) {
          if (typeof startButtonComponent.value === 'string' && startButtonComponent.value.trim().length > 0) {
            buttonText = startButtonComponent.value;
          } else if (typeof startButtonComponent.defaultValue === 'string' && startButtonComponent.defaultValue.trim().length > 0) {
            buttonText = startButtonComponent.defaultValue;
          } else if (typeof startButtonComponent.settings?.defaultValue === 'string' && startButtonComponent.settings.defaultValue.trim().length > 0) {
            buttonText = startButtonComponent.settings.defaultValue;
          }
        }

        if (buttonText && buttonText.trim().length > 0) {
          return buttonText;
        }
      }
    }

    // Default text
    return t('common.saveAndContinue');
  }, [isStartButtonComponent, t]);

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

    // Implicit Association - internal trial engine handles advancement
    if (moduleName.includes('Attribute Testing') ||
        moduleName.includes('Comparing Attribute') ||
        moduleName.includes('Objects Comparing') ||
        moduleName.includes('Object Comparing')) {
      return false;
    }

    // Eye Tracking - internal timer handles advancement
    if (moduleName === 'Eye Tracking' || moduleName.toLowerCase().includes('eye tracking')) {
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

    // Screener real-time disqualification: check if selected choice has eligibility = 'Disqualify'
    if (currentStep === 'screener' && currentModule) {
      const screenerResponses = useParticipantStore.getState().responses;
      let choiceValue: string | undefined;
      for (const r of screenerResponses.values()) {
        if (r.moduleId === 'screener' && r.componentId === 'choice' && typeof r.value === 'string') {
          choiceValue = r.value;
          break;
        }
      }
      if (choiceValue) {
        const components = currentModule.structure?.components ?? [];
        const { resolveScreenerChoiceOptions } = await import('../utils/screenerParticipant');
        const choices = resolveScreenerChoiceOptions(components);
        const selected = choices.find(c => c.id === choiceValue);
        if (selected?.eligibility === 'Disqualify') {
          const bl = backlinks;
          if (bl.disqualified) { redirectTo(bl.disqualified); return; }
          setMobileRestriction(t('errors.disqualified', 'You do not qualify for this survey.'));
          return;
        }
      }
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

      // Check that ALL enabled demographics (predefined + custom screening questions) have been answered
      const demoConfig = currentModule?.config?.demographics as Record<string, unknown> | undefined;
      const enabledDemoKeys = demoConfig
        ? Object.keys(demoConfig).filter(k => {
            const v = demoConfig[k];
            if (v === true) return true;
            if (typeof v === 'object' && v !== null && (v as Record<string, unknown>).enabled === true) return true;
            return false;
          })
        : [];
      const missingKeys = enabledDemoKeys.filter(k => !demoAnswers[k]);
      if (missingKeys.length > 0) {
        alert(t('errors.answerAllDemographics', 'Please answer all demographic questions before continuing.'));
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
            console.warn('[Demographics] Validation failed:', {
              reason: result.reason,
              details: result.details,
              answers: demoAnswers,
            });
            const bl = backlinks;
            if (result.reason === 'RESEARCH_CLOSED') {
              setMobileRestriction(t('errors.researchClosed', 'This survey is no longer accepting responses.'));
              return;
            }
            if (result.reason === 'QUOTA_FULL') {
              if (bl.overquota) { redirectTo(bl.overquota); return; }
              setMobileRestriction(t('errors.quotaFull', 'This survey has reached its participant limit for your profile.'));
              return;
            } else {
              if (bl.disqualified) { redirectTo(bl.disqualified); return; }
              setMobileRestriction(t('errors.disqualified', 'You do not qualify for this survey.'));
              return;
            }
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
        console.log('[handleNext] Submitting responses to backend...');
        try {
          setSubmitting(true);

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

          const errorMessage = error instanceof Error ? error.message : t('errors.unknownError');

          // Check if research is no longer active or participant limit reached
          if (errorMessage.includes('not active') || errorMessage.includes('not found') || errorMessage.includes('Participant limit')) {
            setMobileRestriction(t('errors.researchClosed', 'This survey is no longer accepting responses.'));
            return;
          }

          // Check if error is related to Turnstile verification
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
      }
    }

    // Navigate to next step
    // Redirect/restart on thank-you is handled by the useEffect above (reacts to currentStep change)
    const result = goNext();
    if (!result.success && result.errors) {
      const errorMessage = result.errors.map(e => e.message).join('\n');
      alert(errorMessage);
    }
  }, [isPreviewMode, participantId, researchId, currentModule, getResponsesByModule, goNext, showRestartOption, startNewSession, clearAllResponses, currentStep, backlinks, t, redirectTo]);

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

  // Show redirect screen with logo
  if (redirecting) {
    const logoUrl = `${import.meta.env.BASE_URL}EmotioCX-logo.svg`;
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <img src={logoUrl} alt="EmotioCX" className="h-12 mb-8 opacity-80" />
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-700 mb-4" />
        <p className="text-gray-500 text-sm">{t('redirecting', 'Redirecting...')}</p>
      </div>
    );
  }

  // Show mobile restriction message
  if (mobileRestriction) {
    return <MobileRestrictionScreen message={mobileRestriction} />;
  }

  // Block already-responded participants
  if (alreadyResponded) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 px-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{t('alreadyResponded.title', 'You have already responded')}</h2>
          <p className="text-gray-600 max-w-md">{t('alreadyResponded.message', 'Your responses have been recorded. Thank you for your participation!')}</p>
        </div>
      </MainLayout>
    );
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
          stepsOrder={stepsOrder}
          isPreviewMode={isPreviewMode}
        />
      )}

      {/* Preview / Review Mode Banner */}
      {isReviewMode ? (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-center py-1.5 text-xs font-medium">
          Review Mode — Participant: {reviewParticipantId}
        </div>
      ) : isPreviewMode ? (
        <PreviewModeBanner />
      ) : null}

      {allowLanguageSwitch && <LanguageSelector />}

      {/* Study logo — top-left corner */}
      {studyLogoEnabled && (
        <div className="fixed top-3 left-3 z-40">
          <img
            src={studyLogoUrl || `${import.meta.env.BASE_URL}EmotioCX-logo.svg`}
            alt="Logo"
            className="h-8 object-contain"
          />
        </div>
      )}

      <MainLayout
        footer={
          isReviewMode ? null :
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