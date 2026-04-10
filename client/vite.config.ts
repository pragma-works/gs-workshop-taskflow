import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/users':  'http://localhost:3001',
      '/boards': 'http://localhost:3001',
      '/cards':  'http://localhost:3001',
    },
  },
})
