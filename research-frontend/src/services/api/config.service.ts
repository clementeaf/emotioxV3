/**
 * API Configuration Service
 * Fetches dynamic configuration from backend
 * Implements service discovery pattern - no hardcoded routes
 */

interface RuntimeConfig {
    apiBaseUrl: string;
}

// Backend production URL - Using API Gateway URL directly
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://3jczpvecma.execute-api.us-east-1.amazonaws.com/production';

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
    websocketApiUrl: string | null;
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
            const configUrl = `${baseUrl}/config`;
            console.log('[ConfigService] Fetching config from:', configUrl);
            
            const response = await fetch(configUrl, {
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'No error details');
                console.error('[ConfigService] Config fetch failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: configUrl,
                    error: errorText,
                });
                throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
            }

            // Check content type to ensure we're getting JSON, not HTML
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[ConfigService] Received non-JSON response from /config:', {
                    url: configUrl,
                    contentType,
                    status: response.status,
                    preview: text.substring(0, 500),
                });
                throw new Error(`Expected JSON from ${configUrl} but received ${contentType || 'unknown content type'}. The server may be returning HTML instead of JSON.`);
            }

            const config = await response.json() as ApiConfig;
            console.log('[ConfigService] API configuration loaded:', config.version, config.environment);
            return config;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error('Config fetch timeout after 10 seconds');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Resolve the API base URL from environment or runtime config.
     * Always uses AWS production backend (server.emotiox.org).
     * @returns API base URL without trailing slash
     */
    private async resolveApiBaseUrl(): Promise<string> {
        // Try environment variable first
        const envBaseUrl = this.getEnvApiBaseUrl();
        if (envBaseUrl) {
            return envBaseUrl;
        }

        // In development, if no env var, use production URL directly
        if (import.meta.env.DEV) {
            return DEFAULT_PRODUCTION_API_BASE_URL;
        }

        // In production, try runtime-config.json
        const runtimeConfig = await this.fetchRuntimeConfigFromUrl('/runtime-config.json');
        return this.normalizeBaseUrl(runtimeConfig.apiBaseUrl);
    }

    /**
     * Read API base URL from Vite env.
     * Converts relative URLs (like /dev) to the production AWS URL.
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

        // If it's a relative URL (starts with /), it's likely a proxy path
        // Since we're not using proxy, convert it to the production AWS URL
        if (trimmed.startsWith('/')) {
            console.warn('[ConfigService] Relative URL detected in VITE_API_URL, using production URL instead:', trimmed);
            return DEFAULT_PRODUCTION_API_BASE_URL;
        }

        return this.normalizeBaseUrl(trimmed);
    }


    private async fetchRuntimeConfigFromUrl(url: string): Promise<RuntimeConfig> {
        try {
            // Add cache buster to bypass browser/intermediate caches
            const cacheBuster = `?t=${Date.now()}`;
            const response = await fetch(`${url}${cacheBuster}`, { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(
                    `API base URL is not configured. Provide /runtime-config.json or set VITE_API_URL. Failed to load: ${url} (${response.status} ${response.statusText})`
                );
            }

            // Check content type to ensure we're getting JSON, not HTML
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('[ConfigService] Received non-JSON response:', {
                    url,
                    contentType,
                    preview: text.substring(0, 200),
                });
                throw new Error(`Expected JSON but received ${contentType || 'unknown content type'}. The server may be returning HTML instead of JSON.`);
            }

            const data = await response.json() as unknown;
            if (!this.isRuntimeConfig(data)) {
                throw new Error(`Invalid runtime config format from ${url}. Expected {"apiBaseUrl":"https://..."}`);
            }
            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to fetch runtime config from ${url}: ${error.message}`);
            }
            throw new Error(`Failed to fetch runtime config from ${url}: Unknown error`);
        }
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
