import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * @returns {string}
 */
function resolveSourceUrl() {
  const explicitUrl = process.env.DEPLOYED_RUNTIME_CONFIG_URL;
  if (typeof explicitUrl === 'string' && explicitUrl.trim().length > 0) {
    return explicitUrl.trim();
  }

  const base = process.env.DEPLOYED_PARTICIPANT_FRONTEND_URL || 'https://d2am10cly7c9kf.cloudfront.net';
  return `${String(base).replace(/\/+$/, '')}/runtime-config.json`;
}

/**
 * @param {unknown} value
 * @returns {value is { apiBaseUrl: string }}
 */
function isRuntimeConfig(value) {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.apiBaseUrl === 'string' &&
    value.apiBaseUrl.trim().length > 0
  );
}

/**
 * @param {string} url
 * @returns {Promise<{ apiBaseUrl: string }>}
 */
async function fetchRuntimeConfig(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch runtime-config.json from ${url} (${res.status} ${res.statusText})`);
  }
  /** @type {unknown} */
  const data = await res.json();
  if (!isRuntimeConfig(data)) {
    throw new Error(`Invalid runtime-config.json from ${url}. Expected {"apiBaseUrl":"https://..."}`);
  }
  return data;
}

/**
 * @param {string} projectRoot
 * @param {{ apiBaseUrl: string }} config
 * @returns {Promise<void>}
 */
async function writeLocalRuntimeConfig(projectRoot, config) {
  const publicDir = path.join(projectRoot, 'public');
  await mkdir(publicDir, { recursive: true });
  const outputPath = path.join(publicDir, 'runtime-config.json');
  const json = `${JSON.stringify({ apiBaseUrl: config.apiBaseUrl }, null, 2)}\n`;
  await writeFile(outputPath, json, 'utf8');
}

async function main() {
  const sourceUrl = resolveSourceUrl();
  console.log(`[sync-runtime-config] Fetching: ${sourceUrl}`);

  const config = await fetchRuntimeConfig(sourceUrl);
  await writeLocalRuntimeConfig(process.cwd(), config);
  console.log(`[sync-runtime-config] Wrote public/runtime-config.json (apiBaseUrl=${config.apiBaseUrl})`);
}

main().catch((err) => {
  console.error('[sync-runtime-config] Failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});


