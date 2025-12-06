import { Pool } from 'pg';

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
    ssl: {
        rejectUnauthorized: false
    },
});

// Test connection on initialization
pool.on('connect', () => {
    console.log('✓ Database connected');
});

pool.on('error', (err) => {
    console.error('✗ Database connection error:', err);
});

export default pool;
