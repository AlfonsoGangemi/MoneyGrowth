import { describe, it, expect, vi, beforeEach } from 'vitest'
import handler from './extraetf-detail.js'

function makeReqRes(query = {}, ip = '1.2.3.4') {
  const body = {}
  const res = {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this },
    json(data) { this._body = data; return this },
    setHeader(k, v) { this.headers[k] = v },
  }
  const req = {
    headers: { 'x-forwarded-for': ip },
    query,
  }
  return { req, res }
}

const ISHARES_FIXTURE = {
  fondname: 'iShares MSCI World SRI UCITS ETF (Acc)',
  shortname: 'iShares',
  asset_class: 2,
  asset_class_id: 2,
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('extraetf-detail handler', () => {
  it('restituisce 400 se manca isin', async () => {
    const { req, res } = makeReqRes({})
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toMatch(/isin mancante/i)
  })

  it('restituisce 400 per ISIN non valido', async () => {
    const { req, res } = makeReqRes({ isin: 'INVALID' })
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(res._body.error).toMatch(/non valido/i)
  })

  it('restituisce 502 su errore di rete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')))
    const { req, res } = makeReqRes({ isin: 'IE00BYX2JD69' })
    await handler(req, res)
    expect(res.statusCode).toBe(502)
    expect(res._body.error).toMatch(/rete/i)
  })

  it('restituisce 404 se ExtraETF risponde con 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))
    const { req, res } = makeReqRes({ isin: 'IE00BYX2JD69' })
    await handler(req, res)
    expect(res.statusCode).toBe(404)
  })

  it('mappa correttamente fondname, shortname e asset_class per iShares', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ISHARES_FIXTURE,
    }))
    const { req, res } = makeReqRes({ isin: 'IE00BYX2JD69' })
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._body).toEqual({
      nome: 'MSCI World SRI UCITS ETF (Acc)',
      emittente: 'iShares',
      assetClassNome: 'Azioni',
    })
  })

  it('mappa correttamente risultati in array (json.results)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [ISHARES_FIXTURE] }),
    }))
    const { req, res } = makeReqRes({ isin: 'IE00BYX2JD69' })
    await handler(req, res)
    expect(res.statusCode).toBe(200)
    expect(res._body.nome).toBe('MSCI World SRI UCITS ETF (Acc)')
  })

  it('asset_class_id non trovato → default "Azioni"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...ISHARES_FIXTURE, asset_class: 9999 }),
    }))
    const { req, res } = makeReqRes({ isin: 'IE00BYX2JD69' })
    await handler(req, res)
    expect(res._body.assetClassNome).toBe('Azioni')
  })

  it('tutte le asset class note sono mappate', async () => {
    const cases = [
      [2, 'Azioni'],
      [3, 'Obbligazioni'],
      [4, 'Materie prime'],
      [1160, 'Immobili'],
      [5, 'Mercato monetario'],
      [9, 'Portafogli di ETF'],
      [1240, 'Criptovalute'],
    ]
    for (const [id, atteso] of cases) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...ISHARES_FIXTURE, asset_class: id }),
      }))
      const { req, res } = makeReqRes({ isin: 'IE00BYX2JD69' })
      await handler(req, res)
      expect(res._body.assetClassNome, `asset_class ${id}`).toBe(atteso)
    }
  })
})
