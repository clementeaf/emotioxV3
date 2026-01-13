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
 * Loads runtime secrets from SSM (cached across invocations in a warm Lambda).
 * @returns Secrets configuration
 */
export const getSecrets = async (): Promise<SecretsConfig> => {
    if (cachedSecrets) return cachedSecrets;
    if (secretsPromise) return secretsPromise;

    secretsPromise = (async (): Promise<SecretsConfig> => {
        const prefix = process.env.SSM_PREFIX;
        const region = process.env.SSM_REGION || process.env.AWS_REGION || process.env.APP_AWS_REGION || 'us-east-1';

        if (!prefix) {
            throw new Error('SSM_PREFIX is not configured');
        }

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
    })();

    return secretsPromise;
};


