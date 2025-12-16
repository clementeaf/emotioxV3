/**
 * API Configuration Service
 * Fetches dynamic configuration from backend
 * Implements service discovery pattern - no hardcoded routes
 */

interface RuntimeConfig {
    apiBaseUrl: string;
}

const DEFAULT_DEPLOYED_RUNTIME_CONFIG_URL = 'https://d2am10cly7c9kf.cloudfront.net/runtime-config.json';

interface ApiEndpoints {
    auth: Record<string, string>;
    research: Record<string, string>;
    researchTypes: Record<string, string>;
    researchTechniques: Record<string, string>;
    modules: Record<string, string>;
    moduleTemplates: Record<string, string>;
    questions: Record<string, string>;
    public: Record<string, string>;
    media: Record<string, string>;
    analysis: Record<string, string>;
    enterprises: Record<string, string>;
}

interface ApiConfig {
    version: string;
    environment: string;
    endpoints: ApiEndpoints;
    features: {
        authentication: boolean;
        fileUpload: boolean;
        analytics: boolean;
        cache: boolean;
    };
    limits: {
        maxFileSize: number;
        maxResponseLength: number;
        requestTimeout: number;
    };
    cache: {
        enabled: boolean;
        ttl: number;
    };
}

class ConfigService {
    private config: ApiConfig | null = null;
    private baseUrl: string | null = null;
    private configPromise: Promise<ApiConfig> | null = null;

    constructor() {
        // Base URL is resolved at runtime (env or /runtime-config.json).
    }

    /**
     * Initialize configuration (called once at app startup)
     */
    async init(): Promise<ApiConfig> {
        if (this.config) {
            return this.config;
        }

        if (this.configPromise) {
            return this.configPromise;
        }

        this.baseUrl = await this.resolveApiBaseUrl();
        this.configPromise = this.fetchConfig(this.baseUrl);
        this.config = await this.configPromise;
        return this.config;
    }

    /**
     * Fetch configuration from backend
     */
    private async fetchConfig(baseUrl: string): Promise<ApiConfig> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(`${baseUrl}/config`, {
                signal: controller.signal,
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
            }

            const config = await response.json() as ApiConfig;
            console.log('API configuration loaded:', config.version, config.environment);
            return config;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Resolve the API base URL from environment or runtime config.
     * @returns API base URL without trailing slash
     */
    private async resolveApiBaseUrl(): Promise<string> {
        // In dev (localhost), prefer runtime config to avoid stale VITE_API_URL values.
        if (import.meta.env.DEV) {
            const runtimeConfig = await this.fetchRuntimeConfigWithDevFallback();
            return this.normalizeBaseUrl(runtimeConfig.apiBaseUrl);
        }

        const envBaseUrl = this.getEnvApiBaseUrl();
        if (envBaseUrl) {
            return envBaseUrl;
        }

        const runtimeConfig = await this.fetchRuntimeConfigFromUrl('/runtime-config.json');
        return this.normalizeBaseUrl(runtimeConfig.apiBaseUrl);
    }

    /**
     * Read API base URL from Vite env.
     * @returns normalized base URL without trailing slash, or null if not set
     */
    private getEnvApiBaseUrl(): string | null {
        const raw = import.meta.env.VITE_API_URL;
        if (typeof raw !== 'string') {
            return null;
        }
        const trimmed = raw.trim();
        if (!trimmed) {
            return null;
        }
        return this.normalizeBaseUrl(trimmed);
    }

    /**
     * Load runtime configuration from the app's origin.
     * This file can be injected/updated by deployment without rebuilding the frontend.
     * @returns runtime config object
     */
    private async fetchRuntimeConfigWithDevFallback(): Promise<RuntimeConfig> {
        try {
            return await this.fetchRuntimeConfigFromUrl('/runtime-config.json');
        } catch (error) {
            const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
            if (!isLocalhost) {
                throw error;
            }
            return await this.fetchRuntimeConfigFromUrl(DEFAULT_DEPLOYED_RUNTIME_CONFIG_URL);
        }
    }

    private async fetchRuntimeConfigFromUrl(url: string): Promise<RuntimeConfig> {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(
                `API base URL is not configured. Provide /runtime-config.json or set VITE_API_URL. Failed to load: ${url}`
            );
        }

        const data = await response.json() as unknown;
        if (!this.isRuntimeConfig(data)) {
            throw new Error(`Invalid runtime config format from ${url}. Expected {"apiBaseUrl":"https://..."}`);
        }
        return data;
    }

    /**
     * Validate a runtime config object.
     * @param value - unknown value to validate
     * @returns true if value is a RuntimeConfig
     */
    private isRuntimeConfig(value: unknown): value is RuntimeConfig {
        if (typeof value !== 'object' || value === null) {
            return false;
        }
        const record = value as Record<string, unknown>;
        return typeof record.apiBaseUrl === 'string' && record.apiBaseUrl.trim().length > 0;
    }

    /**
     * Remove trailing slashes from a base URL for consistent URL joins.
     * @param baseUrl - raw base URL
     * @returns normalized base URL
     */
    private normalizeBaseUrl(baseUrl: string): string {
        return baseUrl.replace(/\/+$/, '');
    }

    /**
     * Get full configuration
     */
    getConfig(): ApiConfig {
        if (!this.config) {
            throw new Error('Configuration not initialized. Call init() first.');
        }
        return this.config;
    }

    /**
     * Get specific endpoint URL
     * Replaces :param with actual values
     */
    getEndpoint(category: keyof ApiEndpoints, action: string, params?: Record<string, string>): string {
        if (!this.config) {
            throw new Error('Configuration not initialized. Call init() first.');
        }

        let endpoint = this.config.endpoints[category][action];
        
        if (!endpoint) {
            throw new Error(`Endpoint not found: ${category}.${action}`);
        }

        // Replace :param with actual values
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                endpoint = endpoint.replace(`:${key}`, value);
            });
        }

        return endpoint;
    }

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(feature: keyof ApiConfig['features']): boolean {
        return this.config?.features[feature] ?? false;
    }

    /**
     * Get API base URL
     */
    getBaseUrl(): string {
        if (!this.baseUrl) {
            throw new Error('API base URL not initialized. Call init() first.');
        }
        return this.baseUrl;
    }
}

// Singleton instance
export const configService = new ConfigService();

// Export types
export type { ApiConfig, ApiEndpoints };
