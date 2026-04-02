import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevPlugin() {
  return {
    name: 'api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname
        if (pathname !== '/api/extraetf-quotes' && pathname !== '/api/extraetf-detail') {
          return next()
        }
        // Aggiunge helpers Express-like al res di Node
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
          return res
        }
        req.query = Object.fromEntries(url.searchParams)
        try {
          if (pathname === '/api/extraetf-quotes') {
            const { default: handler } = await import('./api/extraetf-quotes.js')
            await handler(req, res)
          } else {
            const { default: handler } = await import('./api/extraetf-detail.js')
            await handler(req, res)
          }
        } catch (err) {
          console.error('[api-dev]', err)
          if (!res.writableEnded) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Internal server error' }))
          }
        }
      })
    }
  }
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), tailwindcss(), apiDevPlugin()],
  test: {
    environment: 'node',
  },
  build: {
    outDir: isSsrBuild ? 'dist-server' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
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
}))
