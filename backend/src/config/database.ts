import { createPool, type Pool, type ResultSetHeader, type RowDataPacket, type FieldPacket, type SslOptions } from 'mysql2/promise';
import { getSecrets } from './secrets';

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
 * Ensures the MySQL Pool is initialized. In AWS, it loads DB_PASSWORD from SSM at runtime.
 * @returns Initialized MySQL Pool
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
        process.env.DB_PORT = secrets.dbPort || process.env.DB_PORT || '3306';
        process.env.DB_NAME = secrets.dbName || process.env.DB_NAME || '';
        process.env.DB_USER = secrets.dbUser || process.env.DB_USER || '';
        process.env.DB_SSL = secrets.dbSsl || process.env.DB_SSL || '';

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
     */
    async query<R extends QueryResultRow = QueryResultRow>(
        queryTextOrConfig: string | QueryConfig,
        values?: ReadonlyArray<unknown>
    ): Promise<QueryResult<R>> {
        const p = await ensurePool();
        const result = await p.query(queryTextOrConfig as string, values as unknown[]);
        return convertResult<R>(result);
    },

    /**
     * Acquire a client from the pool.
     */
    async connect(): Promise<PoolClient> {
        const p = await ensurePool();
        const connection = await p.getConnection();
        
        return {
            query: async <R extends QueryResultRow = QueryResultRow>(
                queryText: string,
                queryValues?: unknown[]
            ): Promise<QueryResult<R>> => {
                const result = await connection.query(queryText, queryValues as unknown[]);
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
