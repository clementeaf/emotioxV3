/**
 * Cache Helper Utilities
 * Provides utility functions for common cache operations
 */

import cache, { CacheKeys } from '../config/cache';

/**
 * Invalidate all caches related to a research
 */
export const invalidateResearchCaches = (researchId: string): void => {
    cache.delete(`${CacheKeys.RESEARCH}:${researchId}`);
    cache.delete(`${CacheKeys.PUBLIC_RESEARCH}:${researchId}`);
    // Invalidate list caches that might contain this research
    cache.deletePattern(`${CacheKeys.RESEARCH_LIST}:*`);
};

/**
 * Invalidate all caches related to a research type
 */
export const invalidateResearchTypeCaches = (typeId?: string): void => {
    if (typeId) {
        cache.delete(`${CacheKeys.RESEARCH_TYPE}:${typeId}`);
    }
    cache.delete(CacheKeys.RESEARCH_TYPES_LIST);
};

/**
 * Invalidate all caches related to a research technique
 */
export const invalidateResearchTechniqueCaches = (techniqueId?: string): void => {
    if (techniqueId) {
        cache.delete(`${CacheKeys.RESEARCH_TECHNIQUE}:${techniqueId}`);
    }
    cache.delete(CacheKeys.RESEARCH_TECHNIQUES_LIST);
};

/**
 * Invalidate all caches related to module templates
 */
export const invalidateModuleTemplateCaches = (templateId?: string): void => {
    if (templateId) {
        cache.delete(`${CacheKeys.MODULE_TEMPLATE}:${templateId}`);
    }
    cache.delete(CacheKeys.MODULE_TEMPLATES_LIST);
};

/**
 * Invalidate all caches related to stage templates
 */
export const invalidateStageTemplateCaches = (templateId?: string): void => {
    if (templateId) {
        cache.delete(`${CacheKeys.STAGE_TEMPLATE}:${templateId}`);
    }
    cache.delete(CacheKeys.STAGE_TEMPLATES_LIST);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
    return {
        size: cache.size(),
        timestamp: new Date().toISOString()
    };
};

/**
 * Clear all caches (use with caution)
 */
export const clearAllCaches = (): void => {
    cache.clear();
    console.log('🗑️  All caches cleared');
};
