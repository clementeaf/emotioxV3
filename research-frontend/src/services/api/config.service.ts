/**
 * API Configuration Service
 * Fetches dynamic configuration from backend
 * Implements service discovery pattern - no hardcoded routes
 */

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
    private baseUrl: string;
    private configPromise: Promise<ApiConfig> | null = null;

    constructor() {
        // Detect base URL dynamically
        this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
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

        this.configPromise = this.fetchConfig();
        this.config = await this.configPromise;
        return this.config;
    }

    /**
     * Fetch configuration from backend
     */
    private async fetchConfig(): Promise<ApiConfig> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(`${this.baseUrl}/config`, {
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch config: ${response.statusText}`);
            }

            const config = await response.json() as ApiConfig;
            console.log('✓ API Configuration loaded:', config.version, config.environment);
            return config;
        } catch (error) {
            console.error('Failed to load API configuration:', error);
            console.warn('⚠️  Using fallback configuration');
            
            // Fallback to default configuration
            return this.getDefaultConfig();
        }
    }

    /**
     * Get default/fallback configuration
     */
    private getDefaultConfig(): ApiConfig {
        return {
            version: '1.0.0',
            environment: 'development',
            endpoints: {
                auth: {
                    login: '/auth/login',
                    register: '/auth/register',
                    me: '/auth/me',
                    refresh: '/auth/refresh',
                    logout: '/auth/logout',
                },
                research: {
                    list: '/research',
                    create: '/research',
                    getById: '/research/:id',
                    update: '/research/:id',
                    delete: '/research/:id',
                    activate: '/research/:id/activate',
                    stages: '/research/:id/stages',
                    modules: '/research/:id/modules',
                },
                researchTypes: {
                    list: '/research-types',
                    create: '/research-types',
                    getById: '/research-types/:id',
                    update: '/research-types/:id',
                    delete: '/research-types/:id',
                },
                researchTechniques: {
                    list: '/research-techniques',
                    create: '/research-techniques',
                    getById: '/research-techniques/:id',
                    update: '/research-techniques/:id',
                    delete: '/research-techniques/:id',
                    byType: '/research-techniques/by-type/:typeId',
                },
                modules: {
                    list: '/modules',
                    create: '/modules',
                    getById: '/modules/:id',
                    update: '/modules/:id',
                    delete: '/modules/:id',
                },
                moduleTemplates: {
                    list: '/module-templates',
                    create: '/module-templates',
                    getById: '/module-templates/:id',
                    update: '/module-templates/:id',
                    delete: '/module-templates/:id',
                },
                questions: {
                    list: '/questions',
                    create: '/questions',
                    getById: '/questions/:id',
                    update: '/questions/:id',
                    delete: '/questions/:id',
                },
                public: {
                    research: '/public/research/:id',
                    submitResponse: '/public/research/:id/responses',
                },
                media: {
                    upload: '/media/upload',
                    getUrl: '/media/:key',
                    delete: '/media/:key',
                },
                analysis: {
                    research: '/analysis/research/:id',
                },
                enterprises: {
                    list: '/enterprises',
                    create: '/enterprises',
                },
            },
            features: {
                authentication: true,
                fileUpload: true,
                analytics: true,
                cache: true,
            },
            limits: {
                maxFileSize: 5 * 1024 * 1024,
                maxResponseLength: 10000,
                requestTimeout: 30000,
            },
            cache: {
                enabled: true,
                ttl: 300,
            },
        };
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
        return this.baseUrl;
    }
}

// Singleton instance
export const configService = new ConfigService();

// Export types
export type { ApiConfig, ApiEndpoints };
