import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SymD/',
  server: {
    proxy: {
      // Forward /api/* from the Vite dev server → FastAPI on port 8000
      '/api': 'http://localhost:8000',
    },
  },
})
