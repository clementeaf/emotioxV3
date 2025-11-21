require('dotenv').config({ path: '../.env' });
const express = require('express');
const { route } = require('./dist/router');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Convert Express request to Lambda event format
app.use(async (req, res) => {
    const event = {
        httpMethod: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : null,
        queryStringParameters: req.query,
    };

    try {
        const result = await route(event);

        // Set headers
        if (result.headers) {
            Object.keys(result.headers).forEach(key => {
                res.setHeader(key, result.headers[key]);
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
    console.log(`✓ Region: ${process.env.AWS_REGION}\n`);
    console.log('Available endpoints:');
    console.log('  GET  /health');
    console.log('  POST /auth/register');
    console.log('  POST /auth/login');
    console.log('  GET  /auth/me');
    console.log('  GET  /research-types (admin)');
    console.log('  GET  /research');
    console.log('  GET  /public/research/:id\n');
});
