import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @modelcontextprotocol/sdk before importing handler
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    resource: vi.fn(),
    tool: vi.fn(),
    connect: vi.fn(),
  })),
}))
vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn().mockImplementation(() => ({
    handleRequest: vi.fn(),
  })),
}))

// Mock fs so readFileSync doesn't fail in test env
vi.mock('fs', () => ({ readFileSync: vi.fn(() => '// calcoli stub') }))

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGt = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()

function resetChain() {
  mockSingle.mockResolvedValue({ data: null })
  mockGt.mockReturnValue({ single: mockSingle })
  mockEq.mockReturnValue({ gt: mockGt, single: mockSingle, eq: mockEq })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockUpdate.mockReturnValue({ eq: vi.fn().mockReturnValue({}) })
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: mockSelect, update: mockUpdate })),
  })),
}))

import handler from '../mcp.js'

function makeReqRes(authHeader = '') {
  const res = {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(data) { this._body = data; return this },
    setHeader(k, v) { this.headers[k] = v },
    end() { return this },
  }
  const req = {
    method: 'POST',
    headers: { authorization: authHeader },
    body: {},
  }
  return { req, res }
}

beforeEach(() => {
  vi.clearAllMocks()
  resetChain()
})

describe('mcp handler — autenticazione API key', () => {
  it('ritorna 401 se authorization header è assente', async () => {
    const { req, res } = makeReqRes('')
    await handler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res._body.error).toBe('Unauthorized')
  })

  it('ritorna 401 se la chiave non inizia con pac_', async () => {
    const { req, res } = makeReqRes('Bearer invalid_key')
    await handler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res._body.error).toBe('Unauthorized')
  })

  it('ritorna 401 se la chiave pac_ non è trovata nel DB', async () => {
    mockSingle.mockResolvedValue({ data: null })
    const { req, res } = makeReqRes('Bearer pac_' + 'a'.repeat(64))
    await handler(req, res)
    expect(res.statusCode).toBe(401)
    expect(res._body.error).toBe('Unauthorized')
  })

  it('ritorna 405 per metodi non consentiti (es. PUT)', async () => {
    const { req, res } = makeReqRes('Bearer pac_' + 'a'.repeat(64))
    req.method = 'PUT'
    await handler(req, res)
    expect(res.statusCode).toBe(405)
  })
})
