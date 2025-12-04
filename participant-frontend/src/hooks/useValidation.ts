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

        module.structure.components.forEach(component => {
            const responseId = createResponseId(module.id, component.id);
            const response = responses.get(responseId);
            if (response) {
                stepResponses.set(component.id, response.value);
            }
        });

        return validateModule(module, stepResponses);
    }, [responses]);

    return {
        validateStep
    };
};
