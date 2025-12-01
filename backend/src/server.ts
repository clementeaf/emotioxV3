import dotenv from 'dotenv';
import express from 'express';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { route } from './router';
import cache from './config/cache';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Convert Express request to Lambda event format
app.use(async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`\n✓ Server running on http://localhost:${PORT}`);
    console.log(`✓ Database: ${process.env.DB_NAME}`);
    console.log(`✓ Region: ${process.env.AWS_REGION}`);
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
        console.log(`📊 Cache stats: ${cache.size()} entries`);
    }, 300000);
});

