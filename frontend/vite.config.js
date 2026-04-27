import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase chunk size warning limit — Monaco is large
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Monaco into its own chunk so it loads separately
          'monaco-editor': ['@monaco-editor/react'],
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@monaco-editor/react'],
  },
  worker: {
    format: 'es',
  },
})
