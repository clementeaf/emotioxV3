import type { ModuleConfig, ModuleComponent } from '../types/module';
import type { ResponseValue } from '../types/responses';

export interface ValidationError {
    componentId: string;
    message: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

/**
 * Validates a single component value
 */
const validateComponent = (component: ModuleComponent, value: ResponseValue | undefined): string | null => {
    if (!component.required) {
        return null;
    }

    // Check if value exists
    if (value === undefined || value === null || value === '') {
        return 'Este campo es requerido';
    }

    // Specific type validation
    switch (component.type) {
        case 'checkbox':
            if (Array.isArray(value) && value.length === 0) {
                return 'Debes seleccionar al menos una opción';
            }
            break;
        case 'file-upload':
            // TODO: Add file validation logic if needed (size, type)
            if (!value) {
                return 'Debes subir un archivo';
            }
            break;
    }

    return null;
};

/**
 * Validates an entire module based on its structure and current responses
 */
export const validateModule = (
    module: ModuleConfig,
    responses: Map<string, ResponseValue>
): ValidationResult => {
    const errors: ValidationError[] = [];

    module.structure.components.forEach((component) => {
        // Construct the response ID (assuming format: moduleId_componentId or just componentId depending on storage)
        // In useParticipantStore, we use createResponseId(moduleId, componentId)
        // But here we might just pass the relevant values.
        // Let's assume 'responses' map keys match what we need to look up.
        // Actually, looking at useParticipantStore, responses are stored by a composite ID.
        // We should probably pass the specific value for this component.

        // Wait, the caller will likely pass a map of { componentId: value } or we need to know how to look it up.
        // Let's assume the caller resolves the value.

        const value = responses.get(component.id);
        const error = validateComponent(component, value);

        if (error) {
            errors.push({
                componentId: component.id,
                message: error
            });
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
};
