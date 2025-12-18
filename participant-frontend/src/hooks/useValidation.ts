import { useCallback } from 'react';
import { useParticipantStore } from '../stores/useParticipantStore';
import type { ModuleConfig } from '../types/module';
import { validateModule, type ValidationResult } from '../utils/validation';
import { createResponseId } from '../stores/useParticipantStore';

export const useValidation = () => {
    const { responses } = useParticipantStore();

    const validateStep = useCallback((module: ModuleConfig): ValidationResult => {
        // Create a map of componentId -> value for the validator
        const stepResponses = new Map();

        // Special handling for Navigation Flow and Preference Test modules
        // These modules save responses with a specific componentId that may not match structure components
        const isNavigationFlow = module.name === 'Navigation Flow';
        const isPreferenceTest = module.name === 'Preference Test';

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
            // Special handling for SmartVOC modules that use 'scale' component
            const isSmartVOCScale = module.name.includes('CSAT') || 
                                    module.name.includes('NPS') || 
                                    module.name.includes('CES') || 
                                    module.name.includes('CV');
            
            if (isSmartVOCScale) {
                // Check for 'scale' response first
                const scaleResponseId = createResponseId(module.id, 'scale');
                const scaleResponse = responses.get(scaleResponseId);
                if (scaleResponse) {
                    stepResponses.set('scale', scaleResponse.value);
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
    }, [responses]);

    return {
        validateStep
    };
};
