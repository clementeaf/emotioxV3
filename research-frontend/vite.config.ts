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
    port: 12500,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/dev': {
        target: 'https://ro05auvmxc.execute-api.us-east-1.amazonaws.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 12500,
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
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  esbuild: {
    sourcemap: false,
    drop: ['console', 'debugger'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
})
