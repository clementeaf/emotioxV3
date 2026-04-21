import { useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import type { ModuleConfig } from '../types/module';
import { validateModule, type ValidationResult } from '../utils/validation';
import { createResponseId } from '../stores/useParticipantStore';

export const useValidation = () => {
    const validateStep = useCallback((module: ModuleConfig): ValidationResult => {
        // Always get fresh responses from store to avoid stale closures
        const { responses } = useParticipantStore.getState();
        
        // Create a map of componentId -> value for the validator
        const stepResponses = new Map();

        // Special handling for Navigation Flow and Preference Test modules
        // These modules save responses with a specific componentId that may not match structure components
        const isNavigationFlow = module.name === 'Navigation Flow';
        const isPreferenceTest = module.name === 'Preference Test';

        // Screener saves response with componentId='choice'
        const isScreener = module.name === 'Screener';
        if (isScreener) {
            const responseId = createResponseId(module.id, 'choice');
            const response = responses.get(responseId);
            if (response) {
                stepResponses.set('choice', response.value);
            }
            return validateModule(module, stepResponses);
        }

        if (isNavigationFlow || isPreferenceTest) {
            // For these modules, check for the main response component
            // NavigationFlow uses 'navigation-flow-component' or 'navigation-flow' depending on how it's called
            const possibleComponentIds = isNavigationFlow
                ? ['navigation-flow-component', 'navigation-flow']
                : ['preference-test-component', 'preference-test'];
            
            for (const mainComponentId of possibleComponentIds) {
                const responseId = createResponseId(module.id, mainComponentId);
                const response = responses.get(responseId);
                if (response) {
                    stepResponses.set(mainComponentId, response.value);
                    break; // Found a response, no need to check others
                }
            }
            
            // Also check structure components (for backwards compatibility)
            module.structure.components.forEach(component => {
                const responseId = createResponseId(module.id, component.id);
                const response = responses.get(responseId);
                if (response) {
                    stepResponses.set(component.id, response.value);
                }
            });
        } else {
            // Special handling for Ranking module (uses 'ranking' component - array of item IDs)
            const isRanking = module.name === 'Ranking';
            
            if (isRanking) {
                // Check for 'ranking' response - always get fresh from store
                const rankingResponseId = createResponseId(module.id, 'ranking');
                const rankingResponse = responses.get(rankingResponseId);
                if (rankingResponse) {
                    stepResponses.set('ranking', rankingResponse.value);
                    // Debug log
                    console.log('[Ranking Validation] Found ranking response:', {
                        responseId: rankingResponseId,
                        value: rankingResponse.value,
                        valueType: typeof rankingResponse.value,
                        isArray: Array.isArray(rankingResponse.value),
                        arrayLength: Array.isArray(rankingResponse.value) ? rankingResponse.value.length : 'N/A'
                    });
                } else {
                    // Debug log when no response found
                    console.warn('[Ranking Validation] No ranking response found:', {
                        responseId: rankingResponseId,
                        moduleId: module.id,
                        allResponseIds: Array.from(responses.keys())
                    });
                }
            }
            
            // Special handling for Linear Scale module (uses 'scale' component)
            const isLinearScale = module.name === 'Linear Scale';
            
            if (isLinearScale) {
                // Check for 'scale' response - always get fresh from store
                const scaleResponseId = createResponseId(module.id, 'scale');
                const scaleResponse = responses.get(scaleResponseId);
                if (scaleResponse) {
                    stepResponses.set('scale', scaleResponse.value);
                }
            }
            
            // Special handling for SmartVOC modules that use 'scale' component (CSAT, NPS, CES, CV)
            // IMPORTANT: Exclude VOC and NEV which use different component IDs
            const isSmartVOCScale = (module.name.includes('CSAT') || 
                                    module.name.includes('NPS') || 
                                    module.name.includes('CES') || 
                                    module.name.includes('CV')) &&
                                    !module.name.includes('VOC') &&
                                    !module.name.includes('NEV');
            
            if (isSmartVOCScale) {
                // Check for 'scale' response first - always get fresh from store
                const scaleResponseId = createResponseId(module.id, 'scale');
                const scaleResponse = responses.get(scaleResponseId);
                if (scaleResponse) {
                    stepResponses.set('scale', scaleResponse.value);
                }
            }
            
            // Special handling for VOC module (uses 'text' component)
            const isVOC = module.name.includes('VOC') && 
                         !module.name.includes('CSAT') && 
                         !module.name.includes('NPS') && 
                         !module.name.includes('CES') && 
                         !module.name.includes('CV');
            if (isVOC) {
                const textResponseId = createResponseId(module.id, 'text');
                const textResponse = responses.get(textResponseId);
                if (textResponse) {
                    stepResponses.set('text', textResponse.value);
                }
            }
            
            // Special handling for NEV module (uses 'emotions' component)
            const isNEV = module.name.includes('NEV') || module.name.includes('Net Emotional Value');
            if (isNEV) {
                const emotionsResponseId = createResponseId(module.id, 'emotions');
                const emotionsResponse = responses.get(emotionsResponseId);
                if (emotionsResponse) {
                    stepResponses.set('emotions', emotionsResponse.value);
                }
            }
            
            // Special handling for Implicit Association modules (save response as 'iat-trials')
            const isIAT = module.name.includes('Attribute Testing') ||
                module.name.includes('Comparing Attribute') ||
                module.name.includes('Objects Comparing') ||
                module.name.includes('Object Comparing');
            if (isIAT) {
                const iatResponseId = createResponseId(module.id, 'iat-trials');
                const iatResponse = responses.get(iatResponseId);
                if (iatResponse) {
                    stepResponses.set('iat-trials', iatResponse.value);
                }
            }

            // For all modules, also check structure components
            module.structure.components.forEach(component => {
                const responseId = createResponseId(module.id, component.id);
                const response = responses.get(responseId);
                if (response) {
                    stepResponses.set(component.id, response.value);
                }
            });
        }

        return validateModule(module, stepResponses);
    }, []);

    return {
        validateStep
    };
};
