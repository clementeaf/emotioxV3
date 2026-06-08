import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

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

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : '/participant/',
  plugins: [
    react(),
    injectCacheVersion(),
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
          if (id.includes('react-i18next') || id.includes('i18next')) {
            return 'i18n-vendor';
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
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
}))
