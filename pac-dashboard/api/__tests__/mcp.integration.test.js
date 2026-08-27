import { describe, it, expect, vi, afterAll } from 'vitest'
import { createServer } from 'http'

// Test di integrazione contro l'SDK reale (@modelcontextprotocol/server + /node,
// NON mockati) — a differenza di mcp.test.js, che mocka interamente McpServer e il
// transport e quindi non intercetta rotture della migrazione SDK v1 -> v2 / spec
// 2026-07-28 (vedi PAC-170). Solo Supabase è mockato, al confine.
//
// L'handler richiede un vero http.ServerResponse (NodeStreamableHTTPServerTransport
// usa internamente res.writeHead), quindi il "req/res" leggero di mcp.test.js non
// basta qui: si usa un vero http.Server locale e richieste fetch reali.

function makeChain(resolvedData) {
  const chain = {
    select: () => chain, eq: () => chain, gt: () => chain, in: () => chain,
    gte: () => chain, lte: () => chain, update: () => chain,
    single: () => Promise.resolve({ data: Array.isArray(resolvedData) ? resolvedData[0] ?? null : resolvedData }),
    then: (resolve) => resolve({ data: resolvedData }),
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => {
      if (table === 'user_api_keys') return makeChain({ user_id: 'test-user-123', id: 'key-1' })
      if (table === 'etf') return makeChain([{ id: 'etf-1', isin: 'IE00TEST0001', user_id: 'test-user-123', acquisti: [] }])
      return makeChain([])
    },
  }),
}))
vi.mock('fs', () => ({ readFileSync: vi.fn(() => 'export function calcolaCAGR() {}\n') }))

const { default: handler } = await import('../mcp.js')

const server = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => { body += c })
  req.on('end', async () => {
    req.body = body ? JSON.parse(body) : undefined
    res.status = function (c) { this.statusCode = c; return this }
    res.json = function (d) { this.setHeader('content-type', 'application/json'); this.end(JSON.stringify(d)); return this }
    await handler(req, res)
  })
})

let baseUrlPromise
async function listen() {
  if (!baseUrlPromise) {
    baseUrlPromise = new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${server.address().port}`)
    }))
  }
  return baseUrlPromise
}
afterAll(() => new Promise((resolve) => server.close(resolve)))

async function call(body, { authHeader = 'Bearer pac_test', headers = {} } = {}) {
  const base = await listen()
  const res = await fetch(`${base}/api/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      authorization: authHeader,
      ...headers,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try {
    // Le risposte "modern" (2026-07-28) sono JSON puro; le risposte "legacy"
    // sono in formato SSE ("event: message\ndata: {...}") — normalizza entrambe.
    json = JSON.parse(text.startsWith('event:') ? text.slice(text.indexOf('data:') + 5) : text)
  } catch {
    json = undefined
  }
  return { status: res.status, text, json }
}

const modernMeta = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
}
const modernHeaders = { 'MCP-Protocol-Version': '2026-07-28' }

describe('MCP integration — autenticazione', () => {
  it('401 senza Authorization header', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, { authHeader: '' })
    expect(r.status).toBe(401)
    expect(r.json.error).toBe('Unauthorized')
  })

  it('401 con Bearer token che non è una chiave pac_ valida né un JWT valido', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, { authHeader: 'Bearer garbage' })
    expect(r.status).toBe(401)
  })
})

describe('MCP integration — tools/list', () => {
  it('elenca i 6 tool con schemi JSON validi (client legacy, nessun header di versione)', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    expect(r.status).toBe(200)
    const names = r.json.result.tools.map(t => t.name)
    expect(names).toEqual(['get_portafoglio', 'get_etf', 'get_prezzi_storici', 'get_acquisti', 'get_storico', 'get_calcoli'])
    expect(r.json.result.resultType).toBeUndefined()
  })

  it('client sulla revisione 2026-07-28 (header + _meta) riceve resultType/cache-hints/serverInfo', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: modernMeta } },
      { headers: { ...modernHeaders, 'Mcp-Method': 'tools/list' } }
    )
    expect(r.status).toBe(200)
    expect(r.json.result.resultType).toBe('complete')
    expect(r.json.result.ttlMs).toBeGreaterThan(0)
    expect(r.json.result.cacheScope).toBe('public')
    expect(r.json.result._meta['io.modelcontextprotocol/serverInfo'].name).toBe('etflens-portfolio')
  })
})

describe('MCP integration — tools/call', () => {
  it('get_etf ritorna i dati filtrati per utente', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_etf', arguments: {} } })
    expect(r.status).toBe(200)
    const payload = JSON.parse(r.json.result.content[0].text)
    expect(payload).toEqual([{ id: 'etf-1', isin: 'IE00TEST0001', user_id: 'test-user-123', acquisti: [] }])
  })

  it('get_calcoli con indice specifico ritorna errore controllato se la funzione non è nello stub', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_calcoli', arguments: { indice: 'calcolaCAGR' } } })
    expect(r.status).toBe(200)
    const payload = JSON.parse(r.json.result.content[0].text)
    expect(payload.indice).toBe('calcolaCAGR')
    expect(payload.funzione).toContain('calcolaCAGR')
  })

  it('get_calcoli senza indice ritorna l\'intero sorgente', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_calcoli', arguments: {} } })
    const payload = JSON.parse(r.json.result.content[0].text)
    expect(payload.sorgente).toContain('calcolaCAGR')
  })
})

describe('MCP integration — discovery', () => {
  it('server/discover risponde (RPC richiesta dalla revisione 2026-07-28)', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: {} })
    expect(r.status).toBe(200)
  })
})

describe('MCP integration — resources/read', () => {
  it('portfolio://indici ritorna la lista indicatori con cache pubblica (client 2026-07-28)', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'resources/read', params: { uri: 'portfolio://indici', _meta: modernMeta } },
      { headers: { ...modernHeaders, 'Mcp-Method': 'resources/read', 'Mcp-Name': 'portfolio://indici' } }
    )
    expect(r.status).toBe(200)
    expect(r.json.result.cacheScope).toBe('public')
    const indici = JSON.parse(r.json.result.contents[0].text)
    expect(indici.some(i => i.nome === 'calcolaCAGR')).toBe(true)
  })
})

describe('MCP integration — validazione header modern (Mcp-Method / Mcp-Name)', () => {
  it('client 2026-07-28 senza Mcp-Method → 400 HeaderMismatch', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: modernMeta } },
      { headers: modernHeaders }
    )
    expect(r.status).toBe(400)
    expect(r.json.error.code).toBe(-32020)
  })

  it('client 2026-07-28 con Mcp-Method incoerente col body → 400 HeaderMismatch', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: modernMeta } },
      { headers: { ...modernHeaders, 'Mcp-Method': 'resources/list' } }
    )
    expect(r.status).toBe(400)
    expect(r.json.error.code).toBe(-32020)
  })

  it('tools/call senza Mcp-Name → 400 HeaderMismatch', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_calcoli', arguments: {}, _meta: modernMeta } },
      { headers: { ...modernHeaders, 'Mcp-Method': 'tools/call' } }
    )
    expect(r.status).toBe(400)
    expect(r.json.error.code).toBe(-32020)
  })
})

describe('MCP integration — negoziazione di versione (dual-version)', () => {
  it('nessun header MCP-Protocol-Version e nessun _meta → risposta legacy 200 (compat client pre-2026-07-28)', async () => {
    const r = await call({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    expect(r.status).toBe(200)
    expect(r.json.result.resultType).toBeUndefined()
  })

  it('header su una revisione precedente esplicita (2025-11-25) senza envelope → 200 legacy', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      { headers: { 'MCP-Protocol-Version': '2025-11-25' } }
    )
    expect(r.status).toBe(200)
  })

  it('header 2026-07-28 dichiarato ma senza _meta nel body → 400 (envelope incompleto, non un crash)', async () => {
    const r = await call(
      { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} },
      { headers: modernHeaders }
    )
    expect(r.status).toBe(400)
    expect(r.json.error.data.envelope.missing).toContain('_meta')
  })
})
