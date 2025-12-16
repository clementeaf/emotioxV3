import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from '../../utils/response';
import { getRequestOrigin } from '../../utils/request';

/**
 * Config Controller
 * Provides dynamic configuration to frontends
 * No hardcoded endpoints - service discovery pattern
 */

export const handleConfigRoutes = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
    const { httpMethod, path } = event;
    const origin = getRequestOrigin(event);

    try {
        // GET /config - Public endpoint for frontend configuration
        if (path === '/config' && httpMethod === 'GET') {
            return getConfig(origin);
        }

        return error('Config route not found', 404, undefined, origin);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Internal server error';
        console.error('Config routes error:', errorMessage);
        return error(errorMessage, 500, undefined, origin);
    }
};

/**
 * Get dynamic configuration for frontends
 * Provides API routes, feature flags, and environment settings
 */
const getConfig = (origin: string | null): APIGatewayProxyResult => {
    const config = {
        // API version
        version: '1.0.0',
        
        // Environment
        environment: process.env.API_STAGE || 'development',
        
        // API endpoints (relative paths - frontend will use same domain)
        endpoints: {
            // Auth
            auth: {
                login: '/auth/login',
                register: '/auth/register',
                me: '/auth/me',
                refresh: '/auth/refresh',
            },
            
            // Research
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
            
            // Research Types
            researchTypes: {
                list: '/research-types',
                create: '/research-types',
                getById: '/research-types/:id',
                update: '/research-types/:id',
                delete: '/research-types/:id',
            },
            
            // Research Techniques
            researchTechniques: {
                list: '/research-techniques',
                create: '/research-techniques',
                getById: '/research-techniques/:id',
                update: '/research-techniques/:id',
                delete: '/research-techniques/:id',
                byType: '/research-techniques/by-type/:typeId',
            },
            
            // Modules
            modules: {
                list: '/modules',
                create: '/modules',
                getById: '/modules/:id',
                update: '/modules/:id',
                delete: '/modules/:id',
            },
            
            // Module Templates
            moduleTemplates: {
                list: '/module-templates',
                create: '/module-templates',
                getById: '/module-templates/:id',
                update: '/module-templates/:id',
                delete: '/module-templates/:id',
            },
            
            // Questions
            questions: {
                list: '/questions',
                create: '/questions',
                getById: '/questions/:id',
                update: '/questions/:id',
                delete: '/questions/:id',
            },
            
            // Public endpoints (participant-frontend)
            public: {
                research: '/public/research/:id',
                submitResponse: '/public/research/:id/responses',
                mediaByKey: '/public/media/by-key',
            },
            
            // Media
            media: {
                upload: '/media/upload',
                getUrl: '/media/:key',
                delete: '/media/:key',
            },
            
            // Analysis
            analysis: {
                research: '/analysis/research/:id',
            },
            
            // Enterprises
            enterprises: {
                list: '/enterprises',
                create: '/enterprises',
            },
        },
        
        // Feature flags
        features: {
            authentication: true,
            fileUpload: true,
            analytics: true,
            cache: true,
        },
        
        // Limits and constraints
        limits: {
            maxFileSize: 5 * 1024 * 1024, // 5MB
            maxResponseLength: 10000,
            requestTimeout: 30000, // 30s
        },
        
        // Cache settings
        cache: {
            enabled: true,
            ttl: 300, // 5 minutes
        },
    };

    return success(config, 200, undefined, origin);
};
