/**
 * API Configuration Service
 * Fetches dynamic configuration from backend
 * Implements service discovery pattern - no hardcoded routes
 */

interface RuntimeConfig {
    apiBaseUrl: string;
}

// Backend production URL - cPanel
const DEFAULT_PRODUCTION_API_BASE_URL = 'https://emotio.cx/api';

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
     * When the SPA is served from emotio.cx (any subdomain), the cPanel API is mounted at /api on the same host.
     * Uses the document origin so scheme/host match the loaded page (avoids cross-origin calls to emotio.cx from dev.emotio.cx).
     * @returns Normalized API base URL, or null if not an emotio.cx host
     */
    private getSameHostEmotioApiBaseUrl(): string | null {
        if (typeof window === 'undefined') {
            return null;
        }
        const { hostname } = window.location;
        if (!hostname.endsWith('emotio.cx')) {
            return null;
        }
        return this.normalizeBaseUrl(`${window.location.origin}/api`);
    }

    /**
     * If the SPA runs on dev.emotio.cx but runtime-config points at production emotio.cx, same-origin requests would fail CORS.
     * Prefer the dev host's /api in that case.
     * @param apiBaseUrl - URL from runtime-config or env
     * @returns URL to use for API calls
     */
    private rewriteStagingApiBaseIfNeeded(apiBaseUrl: string): string {
        if (typeof window === 'undefined') {
            return apiBaseUrl;
        }
        if (window.location.hostname !== 'dev.emotio.cx') {
            return apiBaseUrl;
        }
        const same = this.getSameHostEmotioApiBaseUrl();
        if (!same) {
            return apiBaseUrl;
        }
        try {
            const configured = new URL(this.normalizeBaseUrl(apiBaseUrl));
            if (configured.hostname === 'emotio.cx' || configured.hostname === 'www.emotio.cx') {
                console.warn('[ConfigService] dev.emotio.cx: runtime config targets production API; using same-host /api');
                return same;
            }
        } catch {
            return this.normalizeBaseUrl(apiBaseUrl);
        }
        return this.normalizeBaseUrl(apiBaseUrl);
    }

    /**
     * Returns the SPA base path (e.g. /research/) for resolving runtime-config next to index.html.
     * @returns Path with trailing slash, or / when deployed at domain root
     */
    private getAppBasePath(): string {
        if (import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/') {
            return import.meta.env.BASE_URL.endsWith('/')
                ? import.meta.env.BASE_URL
                : `${import.meta.env.BASE_URL}/`;
        }
        return '/';
    }

    /**
     * Resolve the API base URL from environment or runtime config.
     * On emotio.cx hosts, page origin + /api wins over VITE_API_URL so scheme matches the document
     * (http://dev.emotio.cx vs https:// baked in build is a different origin and fetch fails).
     * Otherwise VITE_API_URL, then runtime-config.json beside the SPA.
     * @returns API base URL without trailing slash
     */
    private async resolveApiBaseUrl(): Promise<string> {
        const sameHostEmotio = this.getSameHostEmotioApiBaseUrl();
        if (sameHostEmotio) {
            console.log('[ConfigService] Using page origin /api for emotio.cx');
            return sameHostEmotio;
        }

        const envBaseUrl = this.getEnvApiBaseUrl();
        if (envBaseUrl) {
            console.log('[ConfigService] Using VITE_API_URL from environment');
            return envBaseUrl;
        }

        const primaryPath = `${this.getAppBasePath()}runtime-config.json`;
        try {
            const runtimeConfig = await this.fetchRuntimeConfigFromUrl(primaryPath);
            console.log(`[ConfigService] Using runtime-config.json from ${primaryPath}`);
            return this.rewriteStagingApiBaseIfNeeded(runtimeConfig.apiBaseUrl);
        } catch (error) {
            console.warn(`[ConfigService] Failed to load ${primaryPath}, trying root:`, error);
            try {
                const runtimeConfig = await this.fetchRuntimeConfigFromUrl('/runtime-config.json');
                console.log('[ConfigService] Using runtime-config.json from /runtime-config.json');
                return this.rewriteStagingApiBaseIfNeeded(runtimeConfig.apiBaseUrl);
            } catch (rootError) {
                console.warn('[ConfigService] Failed to load /runtime-config.json, trying same-host API:', rootError);
                const sameHost = this.getSameHostEmotioApiBaseUrl();
                if (sameHost) {
                    console.log('[ConfigService] Using same-host /api for emotio.cx');
                    return sameHost;
                }
                console.warn('[ConfigService] Using default production API URL');
                return DEFAULT_PRODUCTION_API_BASE_URL;
            }
        }
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
        // For cPanel, relative URLs should be resolved relative to current origin
        if (trimmed.startsWith('/')) {
            // In production, resolve relative to current origin
            if (typeof window !== 'undefined') {
                const baseUrl = `${window.location.protocol}//${window.location.host}`;
                return this.normalizeBaseUrl(`${baseUrl}${trimmed}`);
            }
            // Fallback for server-side
            return DEFAULT_PRODUCTION_API_BASE_URL;
        }

        return this.normalizeBaseUrl(trimmed);
    }


    private async fetchRuntimeConfigFromUrl(url: string): Promise<RuntimeConfig> {
        try {
            // Add cache buster to bypass browser/intermediate caches
            const cacheBuster = `?t=${Date.now()}`;
            const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
            console.log('[ConfigService] Fetching runtime config from:', fullUrl);
            const response = await fetch(`${fullUrl}${cacheBuster}`, { cache: 'no-store' });
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
                    url: fullUrl,
                    contentType,
                    preview: text.substring(0, 200),
                });
                throw new Error(`Expected JSON but received ${contentType || 'unknown content type'}. The server may be returning HTML instead of JSON.`);
            }

            const data = await response.json() as unknown;
            console.log('[ConfigService] Loaded runtime config:', data);
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
