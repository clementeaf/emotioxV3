/**
 * Safely extracts the module "required" flag from a module config object.
 * Defaults to true when not present or invalid.
 * @param config - Module config object
 * @returns Whether the module is required
 */
export const getModuleRequired = (config: Record<string, unknown> | undefined): boolean => {
    if (!config) return true;
    const value = config.required;
    return typeof value === 'boolean' ? value : true;
};

/**
 * Returns a new module config object with the "required" flag set.
 * @param config - Existing module config
 * @param required - Required flag to set
 * @returns Updated config object
 */
export const withModuleRequired = (
    config: Record<string, unknown> | undefined,
    required: boolean
): Record<string, unknown> => {
    return {
        ...(config || {}),
        required,
    };
};

/**
 * Safely extracts the module "hidden" flag from a module config object.
 * Defaults to false when not present or invalid.
 * @param config - Module config object
 * @returns Whether the module is hidden for participants
 */
export const getModuleHidden = (config: Record<string, unknown> | undefined): boolean => {
    if (!config) return false;
    const value = config.hidden;
    return typeof value === 'boolean' ? value : false;
};

/**
 * Returns a new module config object with the "hidden" flag set.
 * @param config - Existing module config
 * @param hidden - Hidden flag to set
 * @returns Updated config object
 */
export const withModuleHidden = (
    config: Record<string, unknown> | undefined,
    hidden: boolean
): Record<string, unknown> => {
    return {
        ...(config || {}),
        hidden,
    };
};

/**
 * Safely extracts the module "conditionality" flag from a module config object.
 * Defaults to false when not present or invalid.
 * @param config - Module config object
 * @returns Whether the module has conditionality enabled
 */
export const getModuleConditionality = (config: Record<string, unknown> | undefined): boolean => {
    if (!config) return false;
    const value = config.conditionality;
    return typeof value === 'boolean' ? value : false;
};

/**
 * Returns a new module config object with the "conditionality" flag set.
 * @param config - Existing module config
 * @param conditionality - Conditionality flag to set
 * @returns Updated config object
 */
export const withModuleConditionality = (
    config: Record<string, unknown> | undefined,
    conditionality: boolean
): Record<string, unknown> => {
    return {
        ...(config || {}),
        conditionality,
    };
};

/**
 * Checks if a component has a configured value (not empty or default).
 * @param component - Component configuration
 * @returns true if component has a configured value
 */
const hasComponentValue = (component: { value?: string; type?: string; settings?: { readonly?: boolean; defaultValue?: string; [key: string]: unknown } }): boolean => {
    // For file-upload components, check if value contains valid files
    if (component.type === 'file-upload' && component.value) {
        try {
            const parsed = typeof component.value === 'string' 
                ? JSON.parse(component.value) 
                : component.value;
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Check if at least one file has s3Key or url
                return parsed.some((file: unknown) => {
                    if (typeof file === 'object' && file !== null) {
                        const fileObj = file as { s3Key?: string; url?: string };
                        return Boolean(fileObj.s3Key || fileObj.url);
                    }
                    return false;
                });
            }
        } catch {
            // Invalid JSON, consider not configured
        }
        return false;
    }

    // For readonly components, check defaultValue
    if (component.settings?.readonly === true) {
        const defaultValue = component.settings.defaultValue;
        if (defaultValue && typeof defaultValue === 'string' && defaultValue.trim().length > 0) {
            return true;
        }
        return false;
    }

    // For other components, check value
    if (component.value && typeof component.value === 'string' && component.value.trim().length > 0) {
        return true;
    }

    return false;
};

/**
 * Determines if a module has configured values.
 * A module is considered configured if at least one component has a non-empty value.
 * @param components - Array of component configurations
 * @returns true if module has at least one configured component
 */
export const hasModuleConfiguredValues = (components: Array<{ value?: string; type?: string; settings?: { readonly?: boolean; defaultValue?: string; [key: string]: unknown } }>): boolean => {
    if (!components || components.length === 0) {
        return false;
    }

    // Check if at least one component has a configured value
    return components.some(component => hasComponentValue(component));
};


