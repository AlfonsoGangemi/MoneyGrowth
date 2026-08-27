import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function makeReqRes(body) {
  const res = {
    statusCode: 200, headers: {}, _body: undefined,
    status(c) { this.statusCode = c; return this },
    json(d) { this._body = d; return this },
    setHeader(k, v) { this.headers[k] = v },
    end() { return this },
  }
  const req = { method: 'POST', body }
  return { req, res }
}

const rpcMock = vi.fn()
const getUserMock = vi.fn()

vi.mock('../_lib.js', async () => {
  const actual = await vi.importActual('../_lib.js')
  return {
    ...actual,
    adminClient: {
      rpc: (...args) => rpcMock(...args),
      auth: { getUser: (...args) => getUserMock(...args) },
    },
  }
})

const { default: handler } = await import('../authorize.js')

beforeEach(() => {
  rpcMock.mockClear()
  getUserMock.mockClear()
  process.env.VITE_APP_URL = 'https://etflens.app'
  getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  rpcMock.mockImplementation((name) => {
    if (name === 'oauth_insert_auth_code') return Promise.resolve({ error: null })
    return Promise.resolve({ data: [], error: null })
  })
})

describe('oauth/authorize — iss (RFC 9207)', () => {
  it('la redirect_to include sempre iss=<issuer>', async () => {
    rpcMock.mockImplementation((name) => {
      if (name === 'oauth_get_client') return Promise.resolve({ data: [{ redirect_uris: ['https://client.example/cb'], is_active: true }], error: null })
      if (name === 'oauth_insert_auth_code') return Promise.resolve({ error: null })
      return Promise.resolve({ data: [], error: null })
    })
    const { req, res } = makeReqRes({ client_id: 'dcr-client-1', redirect_uri: 'https://client.example/cb', code_challenge: 'abc', access_token: 'tok' })
    await handler(req, res)
    expect(res._body.redirect_to).toContain('iss=https%3A%2F%2Fetflens.app')
  })
})

describe('oauth/authorize — Client ID Metadata Documents (CIMD)', () => {
  const originalFetch = global.fetch
  afterEach(() => { global.fetch = originalFetch })

  it('client_id URL https con documento valido → autorizzato', async () => {
    const clientIdUrl = 'https://app.example.com/oauth/client-metadata.json'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ client_id: clientIdUrl, client_name: 'Example Client', redirect_uris: ['https://app.example.com/callback'] }),
    })
    const { req, res } = makeReqRes({ client_id: clientIdUrl, redirect_uri: 'https://app.example.com/callback', code_challenge: 'abc', access_token: 'tok' })
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._body.redirect_to).toBeTruthy()
    expect(rpcMock).not.toHaveBeenCalledWith('oauth_get_client', expect.anything())
  })

  it('client_id nel documento diverso dalla URL richiesta → invalid_client', async () => {
    const clientIdUrl = 'https://app.example.com/oauth/client-metadata.json'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ client_id: 'https://evil.example.com/other.json', client_name: 'x', redirect_uris: ['https://app.example.com/callback'] }),
    })
    const { req, res } = makeReqRes({ client_id: clientIdUrl, redirect_uri: 'https://app.example.com/callback', code_challenge: 'abc', access_token: 'tok' })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toBe('invalid_client')
  })

  it('redirect_uri non presente nel documento → invalid_redirect_uri', async () => {
    const clientIdUrl = 'https://app.example.com/oauth/client-metadata.json'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ client_id: clientIdUrl, client_name: 'x', redirect_uris: ['https://app.example.com/callback'] }),
    })
    const { req, res } = makeReqRes({ client_id: clientIdUrl, redirect_uri: 'https://attacker.example.com/callback', code_challenge: 'abc', access_token: 'tok' })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toBe('invalid_redirect_uri')
  })

  it('documento non raggiungibile → invalid_client (nessun crash)', async () => {
    const clientIdUrl = 'https://app.example.com/oauth/client-metadata.json'
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))
    const { req, res } = makeReqRes({ client_id: clientIdUrl, redirect_uri: 'https://app.example.com/callback', code_challenge: 'abc', access_token: 'tok' })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toBe('invalid_client')
  })

  it('client_id http:// (non https) NON è trattato come CIMD — nessuna fetch, fallback su DB', async () => {
    global.fetch = vi.fn()
    rpcMock.mockImplementation((name) => {
      if (name === 'oauth_get_client') return Promise.resolve({ data: [], error: null })
      return Promise.resolve({ data: [], error: null })
    })
    const { req, res } = makeReqRes({ client_id: 'http://app.example.com/oauth/client-metadata.json', redirect_uri: 'https://app.example.com/callback', code_challenge: 'abc', access_token: 'tok' })
    await handler(req, res)
    expect(global.fetch).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toBe('invalid_client')
  })
})
