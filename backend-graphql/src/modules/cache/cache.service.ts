import cache from '../../config/cache';
import { getCacheStats, clearAllCaches } from '../../utils/cache-helpers';

/**
 * Get cache statistics
 */
export const getStats = () => {
    return getCacheStats();
};

/**
 * Clear all caches
 */
export const clearAll = (): void => {
    clearAllCaches();
};

/**
 * Clear caches by pattern
 */
export const clearByPattern = (pattern: string): number => {
    return cache.deletePattern(pattern);
};
