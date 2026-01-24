import { loadSsmParameters } from './ssm';

interface SecretsConfig {
    dbPassword: string;
    dbHost?: string;
    dbPort?: string;
    dbName?: string;
    dbUser?: string;
    dbSsl?: string;
}

let cachedSecrets: SecretsConfig | null = null;
let secretsPromise: Promise<SecretsConfig> | null = null;

/**
 * Detects if running in development or production environment
 * Based on the origin header from requests
 * @returns 'development' or 'production'
 */
const detectEnvironment = (): 'development' | 'production' => {
    // Check if NODE_ENV is explicitly set
    if (process.env.NODE_ENV === 'development') {
        return 'development';
    }
    if (process.env.NODE_ENV === 'production') {
        return 'production';
    }
    
    // Default to production for safety
    return 'production';
};

/**
 * Gets the appropriate database name based on environment
 * @param baseName - Base database name from .env
 * @returns Database name with environment suffix
 */
const getDatabaseName = (baseName: string | undefined): string => {
    if (!baseName) {
        throw new Error('DB_NAME not configured in environment variables');
    }
    
    const env = detectEnvironment();
    
    // If already has _dev or _prod suffix, return as is
    if (baseName.endsWith('_dev') || baseName.endsWith('_prod')) {
        return baseName;
    }
    
    // Add environment suffix
    return env === 'development' ? `${baseName}_dev` : baseName;
};

/**
 * Loads runtime secrets from environment variables (cPanel) or SSM (AWS Lambda).
 * For cPanel: uses DB_* environment variables directly (no AWS required).
 * For AWS Lambda: uses SSM Parameter Store if SSM_PREFIX is configured.
 * Automatically selects development or production database based on NODE_ENV.
 * @returns Secrets configuration
 */
export const getSecrets = async (): Promise<SecretsConfig> => {
    if (cachedSecrets) return cachedSecrets;
    if (secretsPromise) return secretsPromise;

    secretsPromise = (async (): Promise<SecretsConfig> => {
        const prefix = process.env.SSM_PREFIX;
        
        // For cPanel/local deployments: use environment variables directly (no AWS)
        // Only use SSM if explicitly configured (for AWS Lambda deployments)
        if (!prefix) {
            const dbPassword = process.env.DB_PASSWORD;
            if (!dbPassword) {
                throw new Error('DB_PASSWORD not found in environment variables. For cPanel, configure DB_* variables in .env file.');
            }
            
            const baseName = process.env.DB_NAME;
            const dbName = getDatabaseName(baseName);
            
            console.log(`[Database] Using database: ${dbName} (${detectEnvironment()})`);
            
            cachedSecrets = {
                dbPassword,
                dbHost: process.env.DB_HOST || 'localhost',
                dbPort: process.env.DB_PORT || '3306',
                dbName,
                dbUser: process.env.DB_USER,
                dbSsl: process.env.DB_SSL || 'false',
            };
            return cachedSecrets;
        }

        // Only try SSM if SSM_PREFIX is explicitly set (AWS Lambda deployments)
        try {
            const region = process.env.SSM_REGION || process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1';
            const values = await loadSsmParameters({
                prefix,
                region,
                names: ['DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_SSL'],
            });

            const dbPassword = values.DB_PASSWORD;
            if (typeof dbPassword !== 'string' || dbPassword.trim().length === 0) {
                throw new Error('DB_PASSWORD not found in SSM');
            }

            cachedSecrets = {
                dbPassword,
                dbHost: values.DB_HOST,
                dbPort: values.DB_PORT,
                dbName: values.DB_NAME,
                dbUser: values.DB_USER,
                dbSsl: values.DB_SSL,
            };
            return cachedSecrets;
        } catch (ssmError) {
            // If SSM fails, fallback to environment variables
            console.warn('Failed to load secrets from SSM, using environment variables:', ssmError);
            const dbPassword = process.env.DB_PASSWORD;
            if (!dbPassword) {
                throw new Error(`DB_PASSWORD not found in environment variables and SSM failed: ${ssmError instanceof Error ? ssmError.message : String(ssmError)}`);
            }
            cachedSecrets = {
                dbPassword,
                dbHost: process.env.DB_HOST || 'localhost',
                dbPort: process.env.DB_PORT || '3306',
                dbName: process.env.DB_NAME,
                dbUser: process.env.DB_USER,
                dbSsl: process.env.DB_SSL || 'false',
            };
            return cachedSecrets;
        }
    })();

    return secretsPromise;
};


