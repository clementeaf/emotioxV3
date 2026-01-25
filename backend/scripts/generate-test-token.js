#!/usr/bin/env node
/**
 * Generate JWT test token for SSE testing
 * Usage: node generate-test-token.js [email]
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

async function generateToken(email) {
    let pool;
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'emotioxv3_dev',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
        });

        console.log('Connecting to database:', {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306'),
            database: process.env.DB_NAME || 'emotioxv3_dev',
            user: process.env.DB_USER || 'root'
        });

        // Test connection
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();

        let query;
        let params;

        if (email) {
            query = 'SELECT id, email, cognito_sub, role FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1';
            params = [email];
        } else {
            query = 'SELECT id, email, cognito_sub, role FROM users WHERE deleted_at IS NULL AND email IS NOT NULL AND cognito_sub IS NOT NULL LIMIT 1';
            params = [];
        }

        console.log('Executing query:', query);
        const [users] = await pool.query(query, params);

        console.log('Query result:', users);

        if (!users || users.length === 0) {
            console.error('❌ No user found');
            await pool.end();
            process.exit(1);
        }

        const user = users[0];
        
        if (!user.cognito_sub) {
            console.error('❌ User found but has no cognito_sub:', user);
            await pool.end();
            process.exit(1);
        }
        const payload = {
            sub: user.cognito_sub,
            email: user.email,
            role: user.role || 'researcher'
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

        console.log('✅ Token generated for:', user.email);
        console.log('Role:', user.role);
        console.log('Sub:', user.cognito_sub);
        console.log('\nToken:');
        console.log(token);

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
        if (pool) await pool.end();
        process.exit(1);
    }
}

const email = process.argv[2];
generateToken(email);
