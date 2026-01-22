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

// Configure multer for file uploads (memory storage for direct processing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
    },
});

// Handle direct file upload endpoint (multipart/form-data)
// This must be before the Lambda router to handle multipart properly
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
