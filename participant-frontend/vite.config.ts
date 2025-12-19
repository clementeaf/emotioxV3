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
export default defineConfig({
  plugins: [react(), injectCacheVersion()],
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
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'ui-vendor';
            }
            if (id.includes('react-router-dom')) {
              return 'router-vendor';
            }
            if (id.includes('zustand')) {
              return 'state-vendor';
            }
            if (id.includes('axios')) {
              return 'http-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  esbuild: {
    sourcemap: false,
  },
})
