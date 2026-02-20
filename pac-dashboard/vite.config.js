import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/justetf-proxy': {
        target: 'https://www.justetf.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/justetf-proxy/, ''),
      },
    },
  },
})
