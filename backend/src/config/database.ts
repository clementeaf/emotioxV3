import { Pool } from 'pg';

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

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
    statement_timeout: 30000,
    ssl: shouldUseSSL(),
});

// Test connection on initialization
pool.on('connect', () => {
    console.log('✓ Database connected');
});

pool.on('error', (err) => {
    console.error('✗ Database connection error:', err);
});

export default pool;
