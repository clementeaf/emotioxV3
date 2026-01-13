import { Pool, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from 'pg';
import { getSecrets } from './secrets';

/**
 * Determina si se debe usar SSL basado en el host de la base de datos
 * - RDS (AWS) requiere SSL
 * - Localhost no soporta SSL
 */
/**
 * Resolves pg SSL configuration for the current environment.
 * @returns SSL config for pg (false disables SSL; object enables SSL with options)
 */
const shouldUseSSL = (): false | { rejectUnauthorized: boolean } => {
    const host = process.env.DB_HOST || '';
    const dbSSL = process.env.DB_SSL;
    
    // Si DB_SSL está explícitamente configurado, usar ese valor
    if (dbSSL !== undefined) {
        const enabled = dbSSL === 'true' || dbSSL === '1';
        return enabled ? { rejectUnauthorized: false } : false;
    }
    
    // Si el host es localhost o 127.0.0.1, no usar SSL
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost')) {
        return false;
    }
    
    // Para RDS (AWS) o hosts remotos, usar SSL
    if (host.includes('.rds.amazonaws.com') || host.includes('.amazonaws.com')) {
        return {
            rejectUnauthorized: false
        };
    }
    
    // Por defecto, no usar SSL para desarrollo local
    return false;
};

type EventHandler = (...args: unknown[]) => void;

let realPool: Pool | null = null;
let poolPromise: Promise<Pool> | null = null;
const pendingEventHandlers: Array<{ event: string; handler: EventHandler }> = [];

/**
 * Ensures the underlying pg Pool is initialized. In AWS, it loads DB_PASSWORD from SSM at runtime.
 * @returns Initialized pg Pool
 */
const ensurePool = async (): Promise<Pool> => {
    if (realPool) return realPool;
    if (poolPromise) return poolPromise;

    poolPromise = (async (): Promise<Pool> => {
        // Always load database config from SSM to ensure we use the correct values
        // SSM is the source of truth, environment variables are fallback
        const secrets = await getSecrets();
        
        // Always use SSM values if available, fallback to env vars
        process.env.DB_PASSWORD = secrets.dbPassword || process.env.DB_PASSWORD || '';
        process.env.DB_HOST = secrets.dbHost || process.env.DB_HOST || '';
        process.env.DB_PORT = secrets.dbPort || process.env.DB_PORT || '5432';
        process.env.DB_NAME = secrets.dbName || process.env.DB_NAME || '';
        process.env.DB_USER = secrets.dbUser || process.env.DB_USER || '';

        const pool = new Pool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 20000, // Increased from 10000 to 20000 for RDS cold starts
            query_timeout: 30000,
            statement_timeout: 30000,
            ssl: shouldUseSSL(),
        });

        pendingEventHandlers.forEach(({ event, handler }) => {
            pool.on(event as never, handler as never);
        });

        // Test connection on initialization
        pool.on('connect', () => {
            console.log('Database connected');
        });

        pool.on('error', (err) => {
            console.error('Database connection error:', err);
        });

        realPool = pool;
        return pool;
    })();

    return poolPromise;
};

/**
 * Lazy pool wrapper compatible with pg Pool usage across the codebase.
 */
const pool = {
    /**
     * Run a SQL query.
     */
    async query<R extends QueryResultRow = QueryResultRow>(
        queryTextOrConfig: string | QueryConfig,
        values?: ReadonlyArray<unknown>
    ): Promise<QueryResult<R>> {
        const p = await ensurePool();
        return p.query<R>(queryTextOrConfig as never, values as never);
    },

    /**
     * Acquire a client from the pool.
     */
    async connect(): Promise<PoolClient> {
        const p = await ensurePool();
        return p.connect();
    },

    /**
     * Register event handlers (connect/error).
     */
    on(event: string, handler: EventHandler): void {
        if (realPool) {
            realPool.on(event as never, handler as never);
            return;
        }
        pendingEventHandlers.push({ event, handler });
    },
};

export default pool;
