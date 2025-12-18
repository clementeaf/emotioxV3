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

    // Special handling for Navigation Flow and Preference Test
    const isNavigationFlow = module.name === 'Navigation Flow';
    const isPreferenceTest = module.name === 'Preference Test';

    if (isNavigationFlow || isPreferenceTest) {
        // For these modules, validate the main response component
        // NavigationFlow uses 'navigation-flow-component' or 'navigation-flow' depending on how it's called
        const possibleComponentIds = isNavigationFlow 
            ? ['navigation-flow-component', 'navigation-flow']
            : ['preference-test-component', 'preference-test'];
        
        // Check if any of the possible component IDs have a response
        for (const mainComponentId of possibleComponentIds) {
            const mainValue = responses.get(mainComponentId);
            
            // If there's a main response, consider it valid (these modules are complete when they have a response)
            if (mainValue !== undefined && mainValue !== null && mainValue !== '') {
                return {
                    isValid: true,
                    errors: []
                };
            }
        }
        
        // If no main response, check if module is required
        // For now, we'll consider these modules valid if they're not explicitly required
        // or if they have any response at all
        if (responses.size > 0) {
            return {
                isValid: true,
                errors: []
            };
        }
    }

    // Special handling for SmartVOC modules that use 'scale' component
    const isSmartVOCScale = module.name.includes('CSAT') || 
                            module.name.includes('NPS') || 
                            module.name.includes('CES') || 
                            module.name.includes('CV');
    
    if (isSmartVOCScale) {
        // For scale-based SmartVOC modules, check for 'scale' response
        const scaleValue = responses.get('scale');
        // Check if scale value exists and is valid (including 0 as a valid value)
        const hasValidScaleValue = scaleValue !== undefined && 
                                   scaleValue !== null && 
                                   scaleValue !== '' &&
                                   (typeof scaleValue === 'number' || (typeof scaleValue === 'string' && scaleValue.trim().length > 0));
        
        if (!hasValidScaleValue) {
            // Check if any component in the structure is required
            const hasRequiredComponent = module.structure.components.some(comp => {
                const displayOnlyIds = ['title', 'description', 'instructions', 'message', 'scale-range', 'range', 'start-label', 'end-label'];
                if (displayOnlyIds.some(id => comp.id.includes(id))) {
                    return false;
                }
                return comp.required === true;
            });
            
            if (hasRequiredComponent) {
                errors.push({
                    componentId: 'scale',
                    message: 'Este campo es requerido'
                });
            }
        }
        // If scale value exists and is valid, module is valid
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // For other modules, validate structure components
    // Skip validation for display-only components (title, description, instructions, message)
    const displayOnlyIds = ['title', 'description', 'instructions', 'message', 'scale-range', 'range'];
    
    module.structure.components.forEach((component) => {
        // Skip display-only components
        if (displayOnlyIds.some(id => component.id.includes(id))) {
            return;
        }

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
