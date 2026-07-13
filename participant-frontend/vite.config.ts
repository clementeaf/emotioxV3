import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'
import type { Plugin } from 'vite'

// Plugin to inject cache version into service worker
const injectCacheVersion = () => {
  return {
    name: 'inject-cache-version',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      try {
        let content = readFileSync(swPath, 'utf-8')
        const cacheVersion = Date.now().toString()
        content = content.replace('__CACHE_VERSION__', cacheVersion)
        writeFileSync(swPath, content)
        console.log(`✓ Injected cache version: ${cacheVersion}`)
      } catch (error) {
        console.error('Failed to inject cache version:', error)
      }
    }
  }
}

// Dev-only: benchmark API middleware for /test/gaze-capture button
const benchmarkApiPlugin = (): Plugin => ({
  name: 'benchmark-api',
  configureServer(server) {
    // POST /api/eval/run — triggers benchmark orchestrator
    server.middlewares.use('/api/eval/run', (req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(405);
        res.end('Method not allowed');
        return;
      }

      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
      req.on('end', () => {
        try {
          const { webmPath, gtJson } = JSON.parse(body);
          const evalDir = resolve(__dirname, 'eval');
          const datasetDir = resolve(evalDir, 'datasets', 'session-auto');
          const resultsDir = resolve(evalDir, 'results');

          mkdirSync(datasetDir, { recursive: true });
          mkdirSync(resultsDir, { recursive: true });

          // Write GT if provided
          if (gtJson) {
            writeFileSync(resolve(datasetDir, 'ground-truth.json'), JSON.stringify(gtJson, null, 2));
          }

          // Resolve video path
          const absWebm = resolve(__dirname, '..', webmPath);
          if (!existsSync(absWebm)) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: `Video not found: ${absWebm}` }));
            return;
          }

          // Convert + run (async — return immediately, results polled)
          const y4mPath = resolve(datasetDir, 'video.y4m');

          // Convert synchronously (usually <5s)
          if (!existsSync(y4mPath)) {
            execSync(`ffmpeg -y -i "${absWebm}" -pix_fmt yuv420p "${y4mPath}"`, { stdio: 'pipe' });
          }

          // Run benchmark in background
          const benchmarkScript = resolve(evalDir, 'runBenchmark.ts');
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const child = require('child_process').spawn(
            'npx', ['tsx', benchmarkScript, absWebm],
            { cwd: __dirname, stdio: 'pipe', detached: true },
          );
          child.unref();

          res.writeHead(202, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'started', y4mPath, datasetDir }));
        } catch (err) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(err) }));
        }
      });
    });

    // GET /api/eval/results — returns latest eval results
    server.middlewares.use('/api/eval/results', (_req, res) => {
      const resultsDir = resolve(__dirname, 'eval', 'results');
      const reportPath = resolve(resultsDir, 'eval-report.json');

      if (existsSync(reportPath)) {
        const content = readFileSync(reportPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(content);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ status: 'no results yet' }));
      }
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : '/participant/',
  plugins: [
    react(),
    injectCacheVersion(),
    ...(mode === 'development' ? [benchmarkApiPlugin()] : []),
    // Inject build time as env variable
    {
      name: 'inject-build-time',
      buildEnd() {
        // Inject build time after build completes
        const indexPath = resolve(__dirname, 'dist/index.html');
        try {
          let content = readFileSync(indexPath, 'utf-8');
          content = content.replace(
            '<head>',
            `<head><script>window.__BUILD_TIME__ = ${Date.now()};</script>`
          );
          writeFileSync(indexPath, content);
        } catch (error) {
          console.error('Failed to inject build time:', error);
        }
      },
      transformIndexHtml(html) {
        // This runs during build, but we'll inject in buildEnd instead
        return html;
      }
    }
  ],
  server: {
    port: 12600,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  preview: {
    port: 12600,
    strictPort: true,
  },
  css: {
    devSourcemap: false,
  },
  build: {
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('@vladmandic/face-api')) {
            return 'face-api-vendor';
          }
          if (id.includes('@mediapipe/tasks-vision')) {
            return 'mediapipe-vendor';
          }
          if (id.includes('webeyetrack')) {
            return 'webeyetrack-vendor';
          }
          if (id.includes('@tanstack/react-query')) {
            return 'query-vendor';
          }
          if (id.includes('react-router-dom') || id.includes('react-router')) {
            return 'router-vendor';
          }
          // react-i18next calls React.createContext at top-level —
          // must be in the same chunk as React to avoid load-order issues
          if (id.includes('react-i18next') || id.includes('i18next')) {
            return 'react-vendor';
          }
          if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) {
            return 'ui-vendor';
          }
          if (id.includes('react-window') || id.includes('@marsidev/react-turnstile')) {
            return 'misc-vendor';
          }
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('zustand')) {
            return 'state-vendor';
          }
          if (id.includes('axios') || id.includes('date-fns')) {
            return 'misc-vendor';
          }
          return undefined;
        },
      },
    },
    // webeyetrack + face-api ML models exceed 1MB — isolated vendor chunks
    chunkSizeWarningLimit: 3000,
  },
  esbuild: {
    sourcemap: false,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision', 'onnxruntime-web'],
  },
}))
