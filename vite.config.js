import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/openrouter': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api/v1/chat/completions',
      },
      '/openrouter-api': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        secure: true,
        rewrite: () => '/api/v1/chat/completions',
      },
    },
  },
})