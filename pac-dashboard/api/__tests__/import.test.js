import { describe, it, expect, vi, beforeEach } from 'vitest'

const EXTRAETF_FIXTURE = {
  fondname: 'iShares MSCI World SRI UCITS ETF (Acc)',
  shortname: 'iShares',
  asset_class: 2,
}

function makeFetchOk(data) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => data })
}

// Costruisce un adminClient/authClient fittizio compatibile con la query
// builder chainable di Supabase (from().select().eq()...), risolvendo in
// base al nome tabella coinvolta in ciascuna chiamata di api/import.js.
function makeAdminClient({
  existingEtf = null,
  brokerRow = { id: 'broker-1' },
  acRows = [{ id: 1, nome: 'Azioni' }, { id: 2, nome: 'Obbligazioni' }],
  insertedEtfId = 'new-etf-1',
} = {}) {
  const updateCalls = []
  const insertCalls = []

  function builder(table) {
    const b = {
      select() { return b },
      eq() { return b },
      insert(row) {
        insertCalls.push({ table, row })
        return b
      },
      update(row) {
        updateCalls.push({ table, row })
        return b
      },
      maybeSingle() {
        if (table === 'subscription_plan') return Promise.resolve({ data: { plan: 'PRO', status: 'active' } })
        if (table === 'broker') return Promise.resolve({ data: brokerRow })
        if (table === 'etf') return Promise.resolve({ data: existingEtf })
        return Promise.resolve({ data: null })
      },
      single() {
        if (table === 'etf') return Promise.resolve({ data: { id: insertedEtfId }, error: null })
        return Promise.resolve({ data: null, error: null })
      },
      then(resolve, reject) {
        const data = table === 'asset_class' ? acRows : null
        return Promise.resolve({ data, error: null }).then(resolve, reject)
      },
    }
    return b
  }

  return {
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      from: builder,
    },
    updateCalls,
    insertCalls,
  }
}

let adminMock

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => adminMock.client),
}))

import handler from '../import.js'

function makeReqRes(body) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(data) { this._body = data; return this },
  }
  const req = {
    method: 'POST',
    headers: { authorization: 'Bearer test-jwt' },
    body,
  }
  return { req, res }
}

function payloadFor(isin) {
  return {
    broker_id: 'broker-1',
    etf: [{ isin, nome: 'MSCI World', emittente: null, acquisti: [] }],
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('POST /api/import — enrichment ExtraETF (PAC-165)', () => {
  it('non chiama ExtraETF e non tocca emittente/asset_class già presenti', async () => {
    adminMock = makeAdminClient({
      existingEtf: { id: 'etf-1', archiviato: false, emittente: 'iShares', asset_class_id: 1 },
    })
    vi.stubGlobal('fetch', vi.fn())

    const { req, res } = makeReqRes(payloadFor('IE00BYX2JD69'))
    await handler(req, res)

    expect(fetch).not.toHaveBeenCalled()
    const etfUpdate = adminMock.updateCalls.find(c => c.table === 'etf')
    expect(etfUpdate.row).not.toHaveProperty('emittente')
    expect(etfUpdate.row).not.toHaveProperty('asset_class_id')
    expect(res.statusCode).toBe(200)
  })

  it('arricchisce emittente/asset_class mancanti su un ETF esistente', async () => {
    adminMock = makeAdminClient({
      existingEtf: { id: 'etf-1', archiviato: false, emittente: null, asset_class_id: null },
    })
    vi.stubGlobal('fetch', makeFetchOk(EXTRAETF_FIXTURE))

    const { req, res } = makeReqRes(payloadFor('IE00BYX2JD69'))
    await handler(req, res)

    expect(fetch).toHaveBeenCalledTimes(1)
    const etfUpdate = adminMock.updateCalls.find(c => c.table === 'etf')
    expect(etfUpdate.row.emittente).toBe('iShares')
    expect(etfUpdate.row.asset_class_id).toBe(1)
  })

  it('arricchisce un nuovo ETF con emittente/asset_class da ExtraETF', async () => {
    adminMock = makeAdminClient({ existingEtf: null, insertedEtfId: 'new-1' })
    vi.stubGlobal('fetch', makeFetchOk(EXTRAETF_FIXTURE))

    const { req, res } = makeReqRes(payloadFor('IE00BYX2JD69'))
    await handler(req, res)

    const etfInsert = adminMock.insertCalls.find(c => c.table === 'etf')
    expect(etfInsert.row.emittente).toBe('iShares')
    expect(etfInsert.row.asset_class_id).toBe(1)
  })

  it('prosegue senza errori se ExtraETF fallisce (enrichment best-effort)', async () => {
    adminMock = makeAdminClient({ existingEtf: null, insertedEtfId: 'new-1' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')))

    const { req, res } = makeReqRes(payloadFor('IE00BYX2JD69'))
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._body.error).toBeUndefined()
    const etfInsert = adminMock.insertCalls.find(c => c.table === 'etf')
    expect(etfInsert.row.emittente).toBeNull()
  })
})
