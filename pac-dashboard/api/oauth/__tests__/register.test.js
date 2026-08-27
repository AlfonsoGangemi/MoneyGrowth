import { describe, it, expect, vi, beforeEach } from 'vitest'

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

vi.mock('../_lib.js', async () => {
  const actual = await vi.importActual('../_lib.js')
  return { ...actual, adminClient: { rpc: (...args) => rpcMock(...args) } }
})

const { default: handler } = await import('../register.js')

beforeEach(() => {
  rpcMock.mockClear()
  process.env.VITE_APP_URL = 'https://etflens.app'
  rpcMock.mockResolvedValue({ error: null })
})

describe('oauth/register — application_type', () => {
  it('omesso → default "web", persistito e riflesso in risposta', async () => {
    const { req, res } = makeReqRes({ client_name: 'Test', redirect_uris: ['https://x.example/cb'] })
    await handler(req, res)
    expect(res.statusCode).toBe(201)
    expect(res._body.application_type).toBe('web')
    expect(rpcMock).toHaveBeenCalledWith('oauth_register_client', expect.objectContaining({ p_application_type: 'web' }))
  })

  it('"native" con redirect loopback (client desktop/CLI) → accettato', async () => {
    const { req, res } = makeReqRes({ client_name: 'CLI Tool', redirect_uris: ['http://127.0.0.1:5555/callback'], application_type: 'native' })
    await handler(req, res)
    expect(res.statusCode).toBe(201)
    expect(res._body.application_type).toBe('native')
    expect(rpcMock).toHaveBeenCalledWith('oauth_register_client', expect.objectContaining({ p_application_type: 'native' }))
  })

  it('valore non valido → 400 invalid_client_metadata', async () => {
    const { req, res } = makeReqRes({ client_name: 'Test', redirect_uris: ['https://x.example/cb'], application_type: 'mobile' })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toBe('invalid_client_metadata')
  })
})
