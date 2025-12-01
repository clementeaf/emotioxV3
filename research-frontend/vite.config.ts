import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 12500,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
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
  },
  esbuild: {
    sourcemap: false,
  },
})
