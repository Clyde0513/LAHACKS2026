import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.CLOUDINARY_SOURCE': '"cli"',
    'process.env.CLD_CLI': '"true"',
  },
  server: {
    proxy: {
      // All /api/* requests in dev are forwarded to the Express API server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
