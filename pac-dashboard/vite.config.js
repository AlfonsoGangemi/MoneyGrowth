import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/justetf-proxy': {
        target: 'https://www.justetf.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          const [, search] = path.split('?')
          const p = new URLSearchParams(search)
          const proxyPath = p.get('proxyPath') || ''
          p.delete('proxyPath')
          const qs = p.toString()
          return `/${proxyPath}${qs ? '?' + qs : ''}`
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[proxy] error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[proxy] →', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[proxy] ←', proxyRes.statusCode, req.url);
          });
        }
      },
    },
  },
})
