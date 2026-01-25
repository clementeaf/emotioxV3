import { createPool, type Pool, type ResultSetHeader, type RowDataPacket, type FieldPacket, type SslOptions } from 'mysql2/promise';
import { getSecrets } from './secrets';
import { AsyncLocalStorage } from 'async_hooks';

// AsyncLocalStorage to track request context
export const requestContext = new AsyncLocalStorage<{ origin?: string }>();

// Two connection pools: production and development
let productionPool: Pool | null = null;
let developmentPool: Pool | null = null;

/**
 * Detects environment based on request origin
 * @param origin - Request origin header
 * @returns 'development' or 'production'
 */
export const detectEnvironmentFromOrigin = (origin?: string): 'development' | 'production' => {
    if (!origin) {
        console.log('[DB Router] No origin, defaulting to production');
        return 'production';
    }
    
    console.log('[DB Router] Checking origin:', origin);
    
    // localhost:12800 = development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log('[DB Router] DEVELOPMENT detected');
        return 'development';
    }
    
    // emotio.cx = production
    console.log('[DB Router] PRODUCTION detected');
    return 'production';
};

/**
 * Gets the appropriate pool based on request context
 * Since we can't create separate databases in cPanel, we use table prefixes
 * But we still use the same pool and manually prefix table names
 */
const getPoolForRequest = async (): Promise<Pool> => {
    // Always use production pool (same database)
    if (!productionPool) {
        const secrets = await getSecrets();
        const dbConfig = {
            host: secrets.dbHost || 'localhost',
            port: parseInt(secrets.dbPort || '3306', 10),
            user: secrets.dbUser,
            password: secrets.dbPassword,
            database: secrets.dbName, // Always use same database
            ssl: secrets.dbSsl === 'true' ? ({ rejectUnauthorized: false } as SslOptions) : undefined,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
        console.log('[DB Router] Creating pool for database:', dbConfig.database);
        productionPool = createPool(dbConfig);
    }
    return productionPool;
};

/**
 * MySQL connection pool configuration
 * Compatible interface with pg Pool for easy migration
 */

type QueryResultRow = RowDataPacket;
type QueryResult<T extends QueryResultRow = QueryResultRow> = {
    rows: T[];
    rowCount: number;
    command: string;
    oid: number;
    fields: unknown[];
};
type QueryConfig = string;

interface PoolClient {
    query<T extends QueryResultRow = QueryResultRow>(
        queryText: string,
        values?: unknown[]
    ): Promise<QueryResult<T>>;
    release(): void;
}

type EventHandler = (...args: unknown[]) => void;

/**
 * Convert PostgreSQL parameterized query syntax to MySQL syntax
 * PostgreSQL uses $1, $2, $3... while MySQL uses ?
 * Also handles some PostgreSQL-specific syntax and functions
 */
const convertPgToMysql = (query: string): string => {
    // Replace $1, $2, $3... with ?
    // Must handle cases like $1, $10, $100 correctly (replace larger numbers first)
    let converted = query;

    // Find all $N patterns and replace with ?
    // Use regex to find the highest number first to avoid $1 replacing part of $10
    const matches = query.match(/\$\d+/g);
    if (matches) {
        // Sort by number descending to replace $10 before $1
        const uniqueMatches = [...new Set(matches)].sort((a, b) => {
            const numA = parseInt(a.slice(1));
            const numB = parseInt(b.slice(1));
            return numB - numA;
        });

        for (const match of uniqueMatches) {
            converted = converted.split(match).join('?');
        }
    }

    // Remove PostgreSQL type casts like ::jsonb, ::text, ::uuid, etc.
    converted = converted.replace(/::(jsonb|json|text|varchar|uuid|int|integer|boolean|timestamp|date|numeric|float|double precision)/gi, '');

    // Convert PostgreSQL ILIKE to MySQL LIKE (MySQL LIKE is case-insensitive by default with utf8_general_ci)
    converted = converted.replace(/\bILIKE\b/gi, 'LIKE');

    // Convert PostgreSQL array syntax ANY($1) to MySQL IN (?)
    // This is a simplified conversion - complex cases may need manual handling
    converted = converted.replace(/= ANY\s*\(\s*\?\s*\)/gi, 'IN (?)');

    // Convert PostgreSQL JSON functions to MySQL equivalents
    // JSON_BUILD_OBJECT('key1', val1, 'key2', val2) -> JSON_OBJECT('key1', val1, 'key2', val2)
    converted = converted.replace(/\bJSON_BUILD_OBJECT\s*\(/gi, 'JSON_OBJECT(');

    // JSON_AGG(expr ORDER BY ...) -> JSON_ARRAYAGG(expr ORDER BY ...)
    // Note: MySQL 8.0.17+ supports ORDER BY in JSON_ARRAYAGG
    converted = converted.replace(/\bJSON_AGG\s*\(/gi, 'JSON_ARRAYAGG(');

    // COALESCE works the same in both, no conversion needed
    // But we need to handle COALESCE with JSON_AGG -> COALESCE with JSON_ARRAYAGG (already handled above)

    // PostgreSQL uuid_generate_v4() -> MySQL UUID()
    converted = converted.replace(/\buuid_generate_v4\s*\(\s*\)/gi, 'UUID()');

    // PostgreSQL NOW() works in MySQL too, no conversion needed
    // PostgreSQL CURRENT_TIMESTAMP works in MySQL too, no conversion needed

    // Column name mapping: stages table uses display_order in MySQL but code uses order_index
    // This handles s.order_index, stages.order_index, and just order_index in context of stages
    converted = converted.replace(/\bs\.order_index\b/g, 's.display_order');
    converted = converted.replace(/\bstages\.order_index\b/g, 'stages.display_order');

    return converted;
};

let realPool: Pool | null = null;
let poolPromise: Promise<Pool> | null = null;
const pendingEventHandlers: Array<{ event: string; handler: EventHandler }> = [];

/**
 * Determines if SSL should be used based on database host
 * @returns SSL config for MySQL
 */
const shouldUseSSL = (): SslOptions | undefined => {
    const host = process.env.DB_HOST || '';
    const dbSSL = process.env.DB_SSL;
    
    // If DB_SSL is explicitly configured, use that value
    if (dbSSL !== undefined) {
        if (dbSSL === 'true' || dbSSL === '1') {
            return { rejectUnauthorized: false };
        }
        return undefined;
    }
    
    // For localhost, don't use SSL
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('localhost')) {
        return undefined;
    }
    
    // For RDS (AWS) or remote hosts, use SSL
    if (host.includes('.rds.amazonaws.com') || host.includes('.amazonaws.com')) {
        return { rejectUnauthorized: false };
    }
    
    // Default: no SSL for local development
    return undefined;
};

/**
 * Ensures the MySQL Pool is initialized.
 * For cPanel: uses DB_* environment variables directly (no AWS required).
 * For AWS Lambda: loads from SSM if SSM_PREFIX is configured.
 * @returns Initialized MySQL Pool
 */
const ensurePool = async (): Promise<Pool> => {
    if (realPool) return realPool;
    if (poolPromise) return poolPromise;

    poolPromise = (async (): Promise<Pool> => {
        // Load database config (from env vars for cPanel, or SSM for AWS Lambda)
        const secrets = await getSecrets();
        
        // Use secrets values (from env vars or SSM) with fallbacks
        process.env.DB_PASSWORD = secrets.dbPassword || process.env.DB_PASSWORD || '';
        process.env.DB_HOST = secrets.dbHost || process.env.DB_HOST || 'localhost';
        process.env.DB_PORT = secrets.dbPort || process.env.DB_PORT || '3306';
        process.env.DB_NAME = secrets.dbName || process.env.DB_NAME || '';
        process.env.DB_USER = secrets.dbUser || process.env.DB_USER || '';
        process.env.DB_SSL = secrets.dbSsl || process.env.DB_SSL || 'false';

        const pool = createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionLimit: 10,
            idleTimeout: 30000,
            connectTimeout: 20000,
            ssl: shouldUseSSL(),
            waitForConnections: true,
            queueLimit: 0,
        });

        // MySQL2 doesn't have 'connect' event like pg, but we can log on first query
        console.log('MySQL pool created');

        realPool = pool;
        return pool;
    })();

    return poolPromise;
};

/**
 * Wrapper to convert mysql2 result format to pg-compatible format
 * MySQL returns [rows, metadata], we need to wrap it as { rows, ... }
 */
const convertResult = <T extends QueryResultRow = QueryResultRow>(
    result: unknown
): QueryResult<T> => {
    // mysql2 returns different formats depending on query type
    // SELECT queries: [RowDataPacket[], FieldPacket[]]
    // INSERT/UPDATE/DELETE: [ResultSetHeader, FieldPacket[]]
    // Type guard to check if it's an array
    if (!Array.isArray(result) || result.length < 2) {
        return {
            rows: [] as T[],
            rowCount: 0,
            command: '',
            oid: 0,
            fields: [],
        } as QueryResult<T>;
    }
    
    const [first, second] = result;
    
    // Check if first element is ResultSetHeader (has affectedRows property)
    if (first && typeof first === 'object' && 'affectedRows' in first) {
        const metadata = first as ResultSetHeader;
        return {
            rows: [] as T[],
            rowCount: metadata.affectedRows || 0,
            command: '',
            oid: 0,
            fields: [],
        } as QueryResult<T>;
    }
    
    // Otherwise it's a SELECT query with rows
    if (Array.isArray(first)) {
        const rows = first as RowDataPacket[];
        return {
            rows: rows as T[],
            rowCount: rows.length,
            command: '',
            oid: 0,
            fields: [],
        } as QueryResult<T>;
    }
    
    // Fallback
    return {
        rows: [] as T[],
        rowCount: 0,
        command: '',
        oid: 0,
        fields: [],
    } as QueryResult<T>;
};

/**
 * Lazy pool wrapper compatible with pg Pool usage across the codebase.
 */
const pool = {
    /**
     * Run a SQL query.
     * Automatically converts PostgreSQL syntax ($1, $2, ::type) to MySQL syntax (?)
     * Uses table prefixes (dev_) for development environment
     */
    async query<R extends QueryResultRow = QueryResultRow>(
        queryTextOrConfig: string | QueryConfig,
        values?: ReadonlyArray<unknown>
    ): Promise<QueryResult<R>> {
        const p = await getPoolForRequest();
        let query = queryTextOrConfig as string;
        
        // Add table prefix for development
        const context = requestContext.getStore();
        const env = detectEnvironmentFromOrigin(context?.origin);
        
        if (env === 'development') {
            console.log('[DB Router] Adding dev_ prefix to tables');
            // List of all tables that need prefixing
            const tables = [
                'researches', 'stages', 'modules', 'questions', 'responses',
                'users', 'enterprises', 'media',
                'research_types', 'research_techniques', 'research_types_techniques',
                'stage_templates', 'module_templates', 'stage_templates_module_templates',
                'analysis_modules', 'quotas', 'monitoring_connections'
            ];
            
            // Replace table names with dev_ prefix
            // Use word boundaries to avoid partial matches
            tables.forEach(table => {
                // Match table name with optional backticks and word boundaries
                const backtick = '`';
                const regex = new RegExp(`(\\b|${backtick})${table}(\\b|${backtick})`, 'gi');
                query = query.replace(regex, (match) => {
                    // Preserve backticks if they exist
                    if (match.startsWith(backtick)) {
                        return `${backtick}dev_${table}${backtick}`;
                    }
                    return `dev_${table}`;
                });
            });
        }
        
        const convertedQuery = convertPgToMysql(query);
        const result = await p.query(convertedQuery, values as unknown[]);
        return convertResult<R>(result);
    },

    /**
     * Acquire a client from the pool.
     * Applies the same dev_ table prefix logic as pool.query() for development environment.
     */
    async connect(): Promise<PoolClient> {
        const p = await ensurePool();
        const connection = await p.getConnection();

        // Capture context at connection time to use in subsequent queries
        const context = requestContext.getStore();
        const env = detectEnvironmentFromOrigin(context?.origin);

        return {
            query: async <R extends QueryResultRow = QueryResultRow>(
                queryText: string,
                queryValues?: unknown[]
            ): Promise<QueryResult<R>> => {
                let query = queryText;

                // Add table prefix for development (same logic as pool.query)
                if (env === 'development') {
                    console.log('[DB Router] connect().query: Adding dev_ prefix to tables');
                    const tables = [
                        'researches', 'stages', 'modules', 'questions', 'responses',
                        'users', 'enterprises', 'media',
                        'research_types', 'research_techniques', 'research_types_techniques',
                        'stage_templates', 'module_templates', 'stage_templates_module_templates',
                        'analysis_modules', 'quotas', 'monitoring_connections'
                    ];

                    tables.forEach(table => {
                        const backtick = '`';
                        const regex = new RegExp(`(\\b|${backtick})${table}(\\b|${backtick})`, 'gi');
                        query = query.replace(regex, (match) => {
                            if (match.startsWith(backtick)) {
                                return `${backtick}dev_${table}${backtick}`;
                            }
                            return `dev_${table}`;
                        });
                    });
                }

                const convertedQuery = convertPgToMysql(query);
                const result = await connection.query(convertedQuery, queryValues as unknown[]);
                return convertResult<R>(result);
            },
            release: () => {
                connection.release();
            },
        };
    },

    /**
     * Register event handlers (for compatibility, MySQL2 doesn't support all pg events).
     */
    on(event: string, handler: EventHandler): void {
        // MySQL2 doesn't have the same event system as pg
        // This is kept for compatibility but may not work the same way
        if (event === 'error') {
            // We can't easily attach error handlers to mysql2 pool
            // Errors will be thrown in queries instead
            console.warn('MySQL pool: error event handler registered but may not work as expected');
        }
    },
};

export default pool;
export type { PoolClient, QueryResult, QueryResultRow };
