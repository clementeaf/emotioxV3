/**
 * Server entry point for cPanel/Passenger
 * This is the compiled version that Passenger will execute
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const { route } = require('./dist/router');
const cache = require('./dist/config/cache').default;
const { monitorSSEService } = require('./dist/modules/monitor/monitor-sse.service');
const { verifyToken } = require('./dist/utils/auth.local');
const { attachSSE, detachSSE, getJob } = require('./dist/modules/attention-prediction/video-prediction-jobs');

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

// Public tracking endpoints: allow ANY origin (snippet runs on external sites)
app.use((req, res, next) => {
    const path = req.path.replace(/^\/api/, '');
    if (path.startsWith('/public/tracking')) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        res.header('Access-Control-Max-Age', '86400');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
        return next();
    }
    next();
});

app.use(cors({
    origin: function (origin, callback, req) {
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

        // Allow any origin — tracking endpoints need this (snippet runs on external sites)
        // Domain validation happens inside createSession, not at CORS level
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token'],
}));

app.use(express.json({ limit: '10mb' }));

app.options('/api/monitor/events/:researchId', (req, res) => {
    const origin = req.headers.origin;
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type,Authorization,Cache-Control,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.status(204).end();
});

// Configure multer for file uploads (memory storage for direct processing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
});

// Handle direct file upload endpoint (multipart/form-data or PUT with raw file)
// This must be before the Lambda router to handle multipart properly
// Supports both POST (multipart/form-data) and PUT (raw file) for compatibility
app.post('/api/media/upload-direct', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { research_id, question_id, media_path } = req.body;
        if (!research_id || !media_path) {
            return res.status(400).json({ error: 'research_id and media_path are required' });
        }

        // Import the handler function
        const { handleDirectUpload } = require('./dist/modules/media/media.controller.local');
        
        // Call the handler with the uploaded file and optional media_path
        const result = await handleDirectUpload(
            research_id,
            question_id || null,
            {
                name: req.file.originalname,
                data: req.file.buffer,
                mimetype: req.file.mimetype,
            },
            media_path // Pass media_path if provided
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        res.status(500).json({ error: errorMessage });
    }
});

// Also support PUT method for raw file uploads (S3-compatible)
// This matches the frontend behavior which uses PUT with file in body
app.put('/api/media/upload-direct', express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    try {
        // For PUT, we need to get research_id and media_path from query params or headers
        // The frontend should send these, but if not, we'll try to extract from the upload_url context
        const research_id = req.query.research_id || req.headers['x-research-id'];
        const question_id = req.query.question_id || req.headers['x-question-id'] || null;
        const media_path = req.query.media_path || req.headers['x-media-path'];
        
        if (!research_id || !media_path) {
            return res.status(400).json({ 
                error: 'research_id and media_path are required. Send as query params: ?research_id=...&media_path=...' 
            });
        }

        if (!req.body || req.body.length === 0) {
            return res.status(400).json({ error: 'No file data provided' });
        }

        // Get content type from headers
        const contentType = req.headers['content-type'] || 'application/octet-stream';
        
        // Import the handler function
        const { handleDirectUpload } = require('./dist/modules/media/media.controller.local');
        
        // Extract filename from media_path or use default
        const fileName = media_path.split('/').pop() || 'uploaded-file';
        
        // Call the handler with the uploaded file data
        const result = await handleDirectUpload(
            research_id,
            question_id || null,
            {
                name: fileName,
                data: Buffer.from(req.body),
                mimetype: contentType,
            },
            media_path
        );

        res.status(200).json(result);
    } catch (error) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        res.status(500).json({ error: errorMessage });
    }
});

// Serve media files statically (for Cognitive Tasks images, etc.)
// This replaces S3 presigned URLs with direct file serving
const MEDIA_BASE_DIR = process.env.MEDIA_BASE_DIR || path.join(__dirname, 'media');
const MEDIA_PUBLIC_URL = process.env.MEDIA_PUBLIC_URL || '/media';

// Ensure media directory exists
if (!fs.existsSync(MEDIA_BASE_DIR)) {
    fs.mkdirSync(MEDIA_BASE_DIR, { recursive: true });
    console.log(`✓ Media directory created: ${MEDIA_BASE_DIR}`);
}

// Serve media files at /media/* or /api/media/*
// This allows URLs like /media/research/123/image.jpg to work
app.use('/media', express.static(MEDIA_BASE_DIR, {
    setHeaders: (res, filePath) => {
        // Set appropriate content type based on file extension
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
        };
        if (contentTypes[ext]) {
            res.setHeader('Content-Type', contentTypes[ext]);
        }
        // Cache control for images (1 hour)
        if (ext.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    },
    dotfiles: 'deny', // Don't serve dotfiles
    index: false, // Don't serve directory listings
}));

// Also serve at /api/media for compatibility
app.use('/api/media', express.static(MEDIA_BASE_DIR, {
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.pdf': 'application/pdf',
            '.mp4': 'video/mp4',
            '.webm': 'video/webm',
        };
        if (contentTypes[ext]) {
            res.setHeader('Content-Type', contentTypes[ext]);
        }
        if (ext.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    },
    dotfiles: 'deny',
    index: false,
}));

// SSE endpoint for live tracking sessions
app.get(['/api/tracking/:researchId/live/stream', '/tracking/:researchId/live/stream'], async (req, res) => {
    try {
        const { researchId } = req.params;
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(401).json({ error: 'Authentication token is required' });
        }

        try {
            await verifyToken(token);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.flushHeaders();

        const { getLiveSessions } = require('./dist/modules/tracking/tracking.service');

        // Send initial data
        const initial = await getLiveSessions(researchId);
        res.write(`data: ${JSON.stringify(initial)}\n\n`);
        if (typeof res.flush === 'function') res.flush();

        // Push updates every 5s
        const interval = setInterval(async () => {
            try {
                const data = await getLiveSessions(researchId);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
                if (typeof res.flush === 'function') res.flush();
            } catch { /* skip tick */ }
        }, 5000);

        // Keep-alive ping every 30s
        const pingInterval = setInterval(() => {
            try { res.write(': ping\n\n'); if (typeof res.flush === 'function') res.flush(); } catch { /* dead */ }
        }, 30000);

        // Cleanup on disconnect
        res.on('close', () => {
            clearInterval(interval);
            clearInterval(pingInterval);
        });

    } catch (err) {
        console.error('[Tracking SSE] Error:', err);
        res.status(500).json({ error: 'SSE connection failed' });
    }
});

// SSE endpoint for real-time monitoring
// GET /api/monitor/events/:researchId?token=xxx
app.get('/api/monitor/events/:researchId', async (req, res) => {
    try {
        const { researchId } = req.params;
        const { token } = req.query;

        if (!token) {
            return res.status(401).json({ error: 'Authentication token is required' });
        }

        // Verify token
        try {
            const decoded = await verifyToken(token);
            const userId = decoded.sub;

            // Generate unique connection ID
            const connectionId = crypto.randomUUID();

            // Register SSE connection
            await monitorSSEService.registerConnection(connectionId, researchId, userId, res);

            console.log(`SSE connection established: ${connectionId} for research ${researchId}`);

        } catch (authError) {
            console.error('SSE auth failed:', authError);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('SSE connection error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Connection failed';
        res.status(500).json({ error: errorMessage });
    }
});

// SSE endpoint for video prediction progress
// GET /api/attention-prediction/research/:researchId/video-predict/stream?jobId=xxx&token=xxx
app.get([
    '/api/attention-prediction/research/:researchId/video-predict/stream',
    '/attention-prediction/research/:researchId/video-predict/stream'
], async (req, res) => {
    try {
        const { token, jobId } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(401).json({ error: 'Authentication token is required' });
        }
        if (!jobId || typeof jobId !== 'string') {
            return res.status(400).json({ error: 'jobId query parameter is required' });
        }

        try {
            await verifyToken(token);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.flushHeaders();

        if (!attachSSE(jobId, res)) {
            // Job not found — check if it already completed
            const job = getJob(jobId);
            const msg = job ? `Job already ${job.status}` : 'Job not found';
            res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
            res.end();
            return;
        }

        // Keep-alive ping every 30s
        const pingInterval = setInterval(() => {
            try { res.write(': ping\n\n'); if (typeof res.flush === 'function') res.flush(); } catch { /* dead */ }
        }, 30000);

        // Cleanup on disconnect
        res.on('close', () => {
            clearInterval(pingInterval);
            detachSSE(jobId, res);
        });

    } catch (err) {
        console.error('[VideoPrediction SSE] Error:', err);
        res.status(500).json({ error: 'SSE connection failed' });
    }
});

// Convert Express request to Lambda event format (for compatibility)
app.use(async (req, res) => {
    // Remove /api prefix if present (cPanel serves app at /api)
    let path = req.path;
    if (path.startsWith('/api')) {
        path = path.substring(4) || '/';
    }
    
    // Debug logging for add-welcome-thankyou endpoint
    if (path.includes('add-welcome-thankyou')) {
        console.log('[server-cpanel] add-welcome-thankyou request:', {
            method: req.method,
            originalPath: req.path,
            processedPath: path,
            url: req.url
        });
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

        // Binary responses (base64-encoded) — decode and send as buffer
        if (result.isBase64Encoded && typeof result.body === 'string') {
            res.status(result.statusCode).send(Buffer.from(result.body, 'base64'));
            return;
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
