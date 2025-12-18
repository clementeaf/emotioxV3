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


