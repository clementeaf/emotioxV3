/**
 * Passenger startup file for Node.js
 * This file is used by Passenger to start the Node.js application
 */

// Load environment variables
require('dotenv').config();

// Set production environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Import and start the Express server
const path = require('path');

// Try to load compiled version first
let serverPath = path.join(__dirname, 'dist', 'server.js');

// If compiled version doesn't exist, try TypeScript version with tsx
if (!require('fs').existsSync(serverPath)) {
    // Check if tsx is available
    try {
        require.resolve('tsx');
        serverPath = path.join(__dirname, 'src', 'server.ts');
        
        // Register tsx to handle TypeScript
        require('tsx/cjs/api').register({
            tsconfig: path.join(__dirname, 'tsconfig.json'),
        });
    } catch (e) {
        console.error('Error: dist/server.js not found and tsx is not available');
        console.error('Please run: npm run build');
        process.exit(1);
    }
}

// Load and start the server
try {
    require(serverPath);
} catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
}
