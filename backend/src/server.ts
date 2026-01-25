import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { route } from './router';
import cache from './config/cache';
import { requestContext } from './config/database';

// Try multiple .env paths for different environments
const envPaths = [
    path.join(__dirname, '../.env'),  // Relative to compiled file (cPanel)
    path.join(process.cwd(), '.env'),  // Current working directory
    '.env',                            // Same directory
    '../.env',                         // Parent directory (local development)
];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`✓ Loaded .env from: ${envPath}`);
        break;
    }
}
// Fallback: try default .env in current directory
if (!process.env.DB_HOST) {
    dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Dynamic origin validation for development
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:12800',  // research-frontend
            'http://localhost:12500',  // research-frontend (legacy, mantener para compatibilidad)
            'http://localhost:12600',  // participant-frontend
            'http://localhost:3000',
            'http://localhost:5173',
            'http://localhost:5174',
            // Production origins
            'https://portal.emotiox.org',  // research-frontend production
            'https://app.emotiox.org',     // participant-frontend production
            // Additional origins from environment
            process.env.CORS_ORIGIN,
            process.env.RESEARCH_FRONTEND_URL,
            process.env.PARTICIPANT_FRONTEND_URL
        ].filter(Boolean); // Remove undefined values

        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`CORS: Origin not allowed: ${origin}`);
            callback(new Error('CORS: Origin not allowed'), false);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
}));

app.use(express.json());

// Convert Express request to Lambda event format and handle with context
app.use(async (req, res) => {
    // Capture origin for database routing
    const origin = req.get('origin') || req.get('referer');
    console.log('[DB Router] Origin:', origin, '| Referer:', req.get('referer'), '| Host:', req.get('host'));
    
    // Run entire handler in AsyncLocalStorage context
    await requestContext.run({ origin }, async () => {
        const event: APIGatewayProxyEvent = {
            httpMethod: req.method,
            path: req.path,
            headers: req.headers as Record<string, string>,
            multiValueHeaders: {},
            body: req.body ? JSON.stringify(req.body) : null,
            isBase64Encoded: false,
            pathParameters: null,
            queryStringParameters: (req.query as Record<string, string>) || null,
            multiValueQueryStringParameters: null,
            stageVariables: null,
            requestContext: {} as APIGatewayProxyEvent['requestContext'],
            resource: req.path,
        };

        try {
            const result = await route(event);

            // Set headers
            if (result.headers) {
                const headers = result.headers;
                Object.keys(headers).forEach((key) => {
                    const value = headers[key];
                    if (value && typeof value === 'string') {
                        res.setHeader(key, value);
                    }
                });
            }

            // Send response
            res.status(result.statusCode).send(result.body);
        } catch (error) {
            console.error('Server error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Database: ${process.env.DB_NAME}`);
    console.log(`✓ Region: ${process.env.APP_AWS_REGION}`);
    console.log(`✓ Cache: Enabled (in-memory)\n`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  POST /auth/register');
    console.log('  POST /auth/login');
    console.log('  GET  /auth/me');
    console.log('  GET  /research-types (admin)');
    console.log('  GET  /research-techniques');
    console.log('  GET  /research');
    console.log('  GET  /public/research/:id');
    console.log('  GET  /cache/stats');
    console.log('  DELETE /cache/clear (admin)\n');

    // Log cache stats every 5 minutes
    setInterval(() => {
        console.log(`Cache stats: ${cache.size()} entries`);
    }, 300000);
});

