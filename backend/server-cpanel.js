/**
 * Server entry point for cPanel/Passenger
 * This is the compiled version that Passenger will execute
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { route } = require('./dist/router');
const cache = require('./dist/config/cache').default;

const app = express();

// Get port from Passenger or environment, default to 3000
const PORT = process.env.PORT || process.env.PASSENGER_PORT || 3000;

// CORS configuration
const allowedOrigins = [
    'http://localhost:12800',
    'http://localhost:12500',
    'http://localhost:12600',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    // Production cPanel
    'https://emotio.cx',
    'https://emotio.cx/research',
    'https://emotio.cx/participant',
    process.env.CORS_ORIGIN,
    process.env.RESEARCH_FRONTEND_URL,
    process.env.PARTICIPANT_FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) {
            return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // Allow any subdomain or path of emotio.cx
        if (origin.includes('emotio.cx')) {
            return callback(null, true);
        }
        
        console.warn(`CORS: Origin not allowed: ${origin}`);
        callback(new Error('CORS: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
}));

app.use(express.json());

// Convert Express request to Lambda event format (for compatibility)
app.use(async (req, res) => {
    // Remove /api prefix if present (cPanel serves app at /api)
    let path = req.path;
    if (path.startsWith('/api')) {
        path = path.substring(4) || '/';
    }
    
    const event = {
        httpMethod: req.method,
        path: path,
        headers: req.headers,
        multiValueHeaders: {},
        body: req.body ? JSON.stringify(req.body) : null,
        isBase64Encoded: false,
        pathParameters: null,
        queryStringParameters: req.query || null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {},
        resource: path,
    };

    try {
        const result = await route(event);

        if (result.headers) {
            Object.keys(result.headers).forEach((key) => {
                const value = result.headers[key];
                if (value && typeof value === 'string') {
                    res.setHeader(key, value);
                }
            });
        }

        // Handle multiValueHeaders (for Set-Cookie)
        if (result.multiValueHeaders) {
            Object.keys(result.multiValueHeaders).forEach((key) => {
                const values = result.multiValueHeaders[key];
                if (Array.isArray(values)) {
                    values.forEach((value) => {
                        res.append(key, value);
                    });
                }
            });
        }

        // Parse body if it's a JSON string and send as JSON
        let bodyToSend = result.body;
        if (typeof result.body === 'string') {
            try {
                const parsed = JSON.parse(result.body);
                res.status(result.statusCode).json(parsed);
                return;
            } catch (e) {
                // Not JSON, send as-is
                bodyToSend = result.body;
            }
        }

        res.status(result.statusCode).send(bodyToSend);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server only if not running under Passenger
// Passenger provides its own server, so we only listen if PORT is explicitly set
if (process.env.PASSENGER_APP_ENV !== 'production' && !process.env.PASSENGER_BASE_URI) {
    app.listen(PORT, () => {
        console.log(`\n✓ Server running on port ${PORT}`);
        console.log(`✓ Database: ${process.env.DB_NAME || 'not configured'}`);
        console.log(`✓ Region: ${process.env.APP_AWS_REGION || 'not configured'}`);
        console.log(`✓ Cache: Enabled (in-memory)\n`);
    });
} else {
    console.log(`\n✓ Running under Passenger`);
    console.log(`✓ Database: ${process.env.DB_NAME || 'not configured'}`);
    console.log(`✓ Region: ${process.env.APP_AWS_REGION || 'not configured'}`);
    console.log(`✓ Cache: Enabled (in-memory)\n`);
}

// Export for Passenger (required)
module.exports = app;
