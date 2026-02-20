import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-utils': ['@tanstack/react-query', 'axios', 'date-fns', 'zustand'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['framer-motion']
        }
      }
    }
  }
})
