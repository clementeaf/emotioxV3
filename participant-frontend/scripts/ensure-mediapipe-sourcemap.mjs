/**
 * @mediapipe/tasks-vision references vision_bundle_mjs.js.map but does not ship it.
 * Vite dev logs ENOENT when resolving the source map. Writes a minimal valid map once.
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = join(root, 'node_modules/@mediapipe/tasks-vision/vision_bundle_mjs.js.map');

const minimal = `${JSON.stringify({
  version: 3,
  file: 'vision_bundle.mjs',
  sources: [],
  names: [],
  mappings: '',
})}\n`;

if (!existsSync(mapPath)) {
  try {
    writeFileSync(mapPath, minimal, 'utf8');
  } catch {
    // node_modules may not exist yet (e.g. ci without install)
  }
}
