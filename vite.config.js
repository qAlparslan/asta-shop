import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// VITE_* için tek kaynak: backend/.env (Node tarafı server.js ile aynı dosya)
export default defineConfig({
  envDir: path.resolve(__dirname, 'backend'),
  plugins: [react()],
  server: {
    port: 3001,
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/favicon.ico': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/sitemap.xml': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/robots.txt': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
