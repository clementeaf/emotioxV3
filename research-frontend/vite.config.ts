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
  plugins: [react(), injectCacheVersion()],
  base: mode === 'development' ? '/' : '/research/',
  server: {
    port: 12800,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
  preview: {
    port: 12800,
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
          if (id.includes('html2pdf')) return 'html2pdf-vendor';
          if (id.includes('pptxgenjs')) return 'pptx-vendor';
          if (id.includes('pdfjs-dist')) return 'pdfjs-vendor';
          if (id.includes('mammoth')) return 'mammoth-vendor';
          if (id.includes('/xlsx/') || id.includes('node_modules/xlsx')) return 'xlsx-vendor';
          if (id.includes('rrweb')) return 'rrweb-vendor';
          if (id.includes('@mediapipe/tasks-vision')) return 'mediapipe-vendor';
          if (id.includes('webeyetrack')) return 'webeyetrack-vendor';
          if (id.includes('framer-motion')) return 'motion-vendor';
          // recharts must stay with react-vendor — a separate chart-vendor chunk creates a
          // circular import (react-vendor ↔ chart-vendor) and React is undefined at runtime.
          if (id.includes('recharts')) return 'react-vendor';
          if (id.includes('@tanstack/react-query')) return 'query-vendor';
          if (id.includes('@dnd-kit')) return 'ui-vendor';
          if (
            id.includes('react-hook-form')
            || id.includes('@hookform/resolvers')
            || id.includes('/zod/')
          ) {
            return 'form-vendor';
          }
          if (
            id.includes('react-router')
            || id.includes('/react-dom/')
            || id.includes('/react/')
          ) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
    // webeyetrack ships a ~2.7MB CNN model as a single chunk — cannot split further
    chunkSizeWarningLimit: 3000,
  },
  esbuild: {
    sourcemap: false,
    drop: ['debugger'],
    pure: ['console.log', 'console.debug', 'console.info', 'console.trace'],
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {},
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
    exclude: ['@mediapipe/tasks-vision'],
  },
}))
