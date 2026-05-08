import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiDevPlugin() {
  return {
    name: 'api-dev',
    configureServer(server) {
      // Carica tutte le variabili da .env/.env.local e le inietta in process.env
      // così i handler serverless le trovano identiche a Vercel
      const env = loadEnv('development', process.cwd(), '')
      Object.assign(process.env, env)

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const pathname = url.pathname
        const API_ROUTES = [
          '/api/extraetf-quotes',
          '/api/extraetf-detail',
          '/api/mcp',
          '/api/import',
        ]
        const isKeysRoute = pathname.startsWith('/api/keys/')
        const isOAuthRoute = pathname.startsWith('/api/oauth/')
        const isWellKnown = pathname === '/.well-known/oauth-authorization-server'
        if (!API_ROUTES.includes(pathname) && !isKeysRoute && !isOAuthRoute && !isWellKnown) return next()

        // Helpers Express-like
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (data) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
          return res
        }
        req.query = Object.fromEntries(url.searchParams)

        // Body parsing per POST/DELETE: JSON o application/x-www-form-urlencoded
        if (!req.body && (req.method === 'POST' || req.method === 'DELETE')) {
          await new Promise((resolve) => {
            let raw = ''
            req.on('data', chunk => { raw += chunk })
            req.on('end', () => {
              const ct = req.headers['content-type'] ?? ''
              if (ct.includes('application/x-www-form-urlencoded')) {
                req.body = Object.fromEntries(new URLSearchParams(raw))
              } else {
                try { req.body = raw ? JSON.parse(raw) : {} } catch { req.body = {} }
              }
              resolve()
            })
          })
        }

        try {
          if (pathname === '/api/extraetf-quotes') {
            const { default: handler } = await import('./api/extraetf-quotes.js')
            await handler(req, res)
          } else if (pathname === '/api/extraetf-detail') {
            const { default: handler } = await import('./api/extraetf-detail.js')
            await handler(req, res)
          } else if (pathname === '/api/mcp') {
            const { default: handler } = await import('./api/mcp.js')
            await handler(req, res)
          } else if (isKeysRoute) {
            const segment = pathname.slice('/api/keys/'.length)
            if (segment === 'generate') {
              const { default: handler } = await import('./api/keys/generate.js')
              await handler(req, res)
            } else {
              req.query = { ...req.query, keyId: segment }
              const { default: handler } = await import('./api/keys/[keyId].js')
              await handler(req, res)
            }
          } else if (pathname === '/api/import') {
            const { default: handler } = await import('./api/import.js')
            await handler(req, res)
          } else if (isWellKnown) {
            const { default: handler } = await import('./api/oauth/metadata.js')
            await handler(req, res)
          } else if (isOAuthRoute) {
            const segment = pathname.slice('/api/oauth/'.length)
            if (segment === 'metadata') {
              const { default: handler } = await import('./api/oauth/metadata.js')
              await handler(req, res)
            } else if (segment === 'authorize') {
              const { default: handler } = await import('./api/oauth/authorize.js')
              await handler(req, res)
            } else if (segment === 'token') {
              const { default: handler } = await import('./api/oauth/token.js')
              await handler(req, res)
            } else if (segment === 'register') {
              const { default: handler } = await import('./api/oauth/register.js')
              await handler(req, res)
            }
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
