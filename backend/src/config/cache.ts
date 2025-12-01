/**
 * Cache Configuration
 * Simple in-memory cache with TTL support
 * Can be replaced with Redis for production use
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class Cache {
    private cache: Map<string, CacheEntry<any>>;
    private defaultTTL: number; // in seconds

    constructor(defaultTTL: number = 300) { // 5 minutes default
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
        
        // Clean up expired entries every minute
        setInterval(() => this.cleanup(), 60000);
    }

    /**
     * Get value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    /**
     * Set value in cache
     */
    set<T>(key: string, value: T, ttl?: number): void {
        const expiresAt = Date.now() + (ttl || this.defaultTTL) * 1000;
        this.cache.set(key, { value, expiresAt });
    }

    /**
     * Delete value from cache
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Delete all keys matching pattern
     */
    deletePattern(pattern: string): number {
        let count = 0;
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        
        return count;
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get cache size
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Check if key exists
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        
        if (!entry) {
            return false;
        }

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Remove expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get or set value (fetch if not cached)
     */
    async getOrSet<T>(
        key: string, 
        fetchFn: () => Promise<T>, 
        ttl?: number
    ): Promise<T> {
        const cached = this.get<T>(key);
        
        if (cached !== null) {
            return cached;
        }

        const value = await fetchFn();
        this.set(key, value, ttl);
        return value;
    }
}

// Cache TTL configurations (in seconds)
export const CacheTTL = {
    SHORT: 60,        // 1 minute
    MEDIUM: 300,      // 5 minutes
    LONG: 900,        // 15 minutes
    VERY_LONG: 3600,  // 1 hour
    DAY: 86400,       // 24 hours
};

// Cache key prefixes for organization
export const CacheKeys = {
    RESEARCH_TYPE: 'research_type',
    RESEARCH_TYPES_LIST: 'research_types:list',
    RESEARCH_TECHNIQUE: 'research_technique',
    RESEARCH_TECHNIQUES_LIST: 'research_techniques:list',
    MODULE_TEMPLATE: 'module_template',
    MODULE_TEMPLATES_LIST: 'module_templates:list',
    STAGE_TEMPLATE: 'stage_template',
    STAGE_TEMPLATES_LIST: 'stage_templates:list',
    RESEARCH: 'research',
    RESEARCH_LIST: 'research:list',
    MODULE: 'module',
    QUESTION: 'question',
    PUBLIC_RESEARCH: 'public:research',
};

// Create singleton instance
const cache = new Cache(CacheTTL.MEDIUM);

export default cache;
