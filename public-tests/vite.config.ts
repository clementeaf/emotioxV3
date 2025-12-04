import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Generar un hash simple basado en la fecha/hora del build
const buildHash = Date.now().toString(36)

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'inject-build-hash',
      transformIndexHtml(html) {
        return html.replace(/__BUILD_HASH__/g, buildHash)
      },
    },
  ],
  define: {
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(buildHash),
    'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/dist'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@tanstack/react-query', 'zustand'],


          // Feature chunks - solo archivos que existen
          'common': [
            './src/components/common/FormField.tsx'
          ],
          'test-layout': [
            './src/components/TestLayout/components/TestLayoutMain.tsx',
            './src/components/TestLayout/TestLayoutRenderer.tsx',
            './src/components/TestLayout/components/StepItem.tsx',
            './src/components/TestLayout/QuestionComponent.tsx',
            './src/components/TestLayout/ButtonSteps.tsx'
          ],
          'test-layout-emotion': [
            './src/components/TestLayout/emotion/EmotionHierarchySelector.tsx',
            './src/components/TestLayout/emotion/DetailedEmotionSelector.tsx'
          ],
          'test-layout-demographic': [
            './src/components/TestLayout/demographic/DemographicForm.tsx',
            './src/components/TestLayout/demographic/DemographicFormUI.tsx'
          ],
          'test-layout-cognitive': [
            './src/components/TestLayout/cognitive/NavigationFlowTask.tsx',
            './src/components/TestLayout/cognitive/PreferenceTestTask.tsx'
          ]
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        },
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name]-[hash].js';
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'zustand'
    ],
    exclude: ['../shared']
  }
}))
