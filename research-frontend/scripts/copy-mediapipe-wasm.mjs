import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Copies @mediapipe/tasks-vision WASM assets into public/ so the app can load them under same-origin (CSP script-src 'self').
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destDir = path.join(root, 'public', 'mediapipe', 'tasks-vision', 'wasm');

if (!fs.existsSync(srcDir)) {
    console.warn('[copy-mediapipe-wasm] Skip: missing', srcDir);
    process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
for (const name of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
}
console.log('[copy-mediapipe-wasm] Copied to', destDir);
