import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { jwtVerify } from 'jose'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { join } from 'path'
import { z } from 'zod'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const calcoliSource = readFileSync(join(__dirname, '../src/utils/calcoli.js'), 'utf8')

const adminClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Lista statica delle funzioni esportate da calcoli.js
const INDICI = [
  { nome: 'totaleInvestito',            descrizione: 'Total invested capital (importoInvestito + fees)',                                            funzione: 'totaleInvestito(acquisti)' },
  { nome: 'totaleQuote',                descrizione: 'Total accumulated units/shares',                                                             funzione: 'totaleQuote(acquisti)' },
  { nome: 'valoreAttuale',              descrizione: 'Current portfolio value at the current price',                                               funzione: 'valoreAttuale(acquisti, prezzoCorrente)' },
  { nome: 'calcolaROI',                 descrizione: 'ROI percentage: (currentValue - invested) / invested * 100',                                funzione: 'calcolaROI(acquisti, prezzoCorrente)' },
  { nome: 'calcolaRendimentoNetto',     descrizione: 'Net return in €: currentValue - totalInvested',                                             funzione: 'calcolaRendimentoNetto(acquisti, prezzoCorrente)' },
  { nome: 'calcolaDurataM',             descrizione: 'Duration in months from the first purchase to today',                                       funzione: 'calcolaDurataM(acquisti)' },
  { nome: 'calcolaCAGR',                descrizione: 'CAGR: compound annual growth rate',                                                         funzione: 'calcolaCAGR(acquisti, prezzoCorrente)' },
  { nome: 'calcolaTWRR',                descrizione: 'Approximate TWRR: time-weighted return for PAC cash flows',                                 funzione: 'calcolaTWRR(acquisti, prezzoCorrente)' },
  { nome: 'calcolaATWRR',               descrizione: 'ATWRR: annualized geometric mean of TWRR',                                                  funzione: 'calcolaATWRR(acquisti, prezzoCorrente)' },
  { nome: 'calcolaIRR',                 descrizione: 'XIRR: internal rate of return for irregular cash flows (Newton-Raphson, annualized %)',     funzione: 'calcolaIRR(acquisti, prezzoCorrente)' },
  { nome: 'serieStorica',               descrizione: 'Historical series {date, value} using purchase prices as NAV proxy',                        funzione: 'serieStorica(acquisti, prezzoCorrente)' },
  { nome: 'serieStoricaAggregata',      descrizione: 'Aggregated multi-ETF historical series with unified timeline and carry-forward',            funzione: 'serieStoricaAggregata(etfList)' },
  { nome: 'serieStoricaDaPrezziStorici',descrizione: 'Monthly historical series from etf_prezzi_storici with 3-level fallback',                   funzione: 'serieStoricaDaPrezziStorici(etfList, prezziStorici)' },
  { nome: 'calcolaMaxDrawdown',         descrizione: 'Max Drawdown: maximum percentage loss from peak (returns negative value)',                   funzione: 'calcolaMaxDrawdown(serie)' },
  { nome: 'calcolaVolatilita',          descrizione: 'Annualized monthly volatility: std dev of monthly returns * sqrt(12)',                      funzione: 'calcolaVolatilita(serie)' },
  { nome: 'calcolaProiezione',          descrizione: 'Projection with monthly compound interest (future PAC)',                                     funzione: 'calcolaProiezione(valoreIniziale, versamentoMensile, rendimentoAnnuo, orizzonteAnni, dataInizio)' },
  { nome: 'indicatoriPortafoglio',      descrizione: 'Portfolio aggregates: totInvestito, totValore, roi, netto, durataM, cagr, totFee',          funzione: 'indicatoriPortafoglio(etfList)' },
  { nome: 'distribuzioneAssetClass',    descrizione: 'Percentage distribution by asset class, sorted by weight descending',                       funzione: 'distribuzioneAssetClass(etfList, brokerFiltro)' },
]

function buildMeta() {
  return {
    generated_at: new Date().toISOString(),
    avviso: 'Prices (prezzoCorrente) reflect the last manual sync in the app. They are not real-time market prices.',
    archiviati_inclusi: true,
  }
}

function extractFunction(source, name) {
  const lines = source.split('\n')
  let startLine = -1
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`^export function ${name}\\b`).test(lines[i])) {
      startLine = i
      break
    }
  }
  if (startLine === -1) return null

  // Includi JSDoc sopra la funzione
  let docStart = startLine
  if (startLine > 0 && lines[startLine - 1].trimEnd() === ' */') {
    let j = startLine - 1
    while (j >= 0 && !lines[j].trimStart().startsWith('/**')) j--
    if (j >= 0) docStart = j
  }

  // Trova la fine contando le parentesi graffe
  let depth = 0
  let endLine = startLine
  for (let i = startLine; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') depth++
      else if (ch === '}') depth--
    }
    if (depth === 0 && i > startLine) { endLine = i; break }
  }

  return lines.slice(docStart, endLine + 1).join('\n')
}

function textContent(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj) }] }
}

async function resolveUserId(authHeader) {
  const token = authHeader?.replace('Bearer ', '').trim() ?? ''
  if (!token) return null

  if (token.startsWith('pac_')) {
    const hash = createHash('sha256').update(token).digest('hex')
    const { data } = await adminClient
      .from('user_api_keys')
      .select('user_id, id')
      .eq('key_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!data) return null
    // Aggiorna last_used_at in background (fire-and-forget)
    adminClient
      .from('user_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id)
    return data.user_id
  }

  try {
    const secret = new TextEncoder().encode(process.env.OAUTH_JWT_SECRET)
    const iss = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')
    const { payload } = await jwtVerify(token, secret, {
      issuer: iss,
      audience: 'etflens-mcp',
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}

function buildMcpServer(userId) {
  const server = new McpServer({
    name: 'etflens-portfolio',
    version: '1.0.0',
  })

  // ── Resources ──────────────────────────────────────────────────────────────

  server.resource(
    'portfolio://broker',
    'broker',
    { mimeType: 'application/json', description: 'Array of the user\'s brokers (including archived ones). Prices are not real-time.' },
    async () => {
      if (!userId) throw new Error('userId null')
      const { data } = await adminClient.from('broker').select('*').eq('user_id', userId)
      return { contents: [{ uri: 'portfolio://broker', text: JSON.stringify(data ?? []) }] }
    }
  )

  server.resource(
    'portfolio://indici',
    'indici',
    { mimeType: 'application/json', description: 'List of financial indicators computable via calcoli.js, with function signature and description.' },
    async () => {
      return { contents: [{ uri: 'portfolio://indici', text: JSON.stringify(INDICI) }] }
    }
  )

  server.resource(
    'portfolio://formulas/calcoli',
    'calcoli',
    { mimeType: 'text/javascript', description: 'Full source of calcoli.js. Prices in the data are not real-time.' },
    async () => {
      return { contents: [{ uri: 'portfolio://formulas/calcoli', text: calcoliSource }] }
    }
  )

  // ── Tools ──────────────────────────────────────────────────────────────────

  server.tool(
    'get_portafoglio',
    'Returns all portfolio data in a single payload (ETFs with purchases, historical prices, scenarios, brokers, annual history). Prices are not real-time.',
    async () => {
      if (!userId) throw new Error('userId null')
      const { data: etfs } = await adminClient
        .from('etf')
        .select('*, acquisti(*)')
        .eq('user_id', userId)

      const isins = (etfs ?? []).map(e => e.isin).filter(Boolean)
      const [prezziRes, scenariRes, brokerRes, storicoRes] = await Promise.all([
        isins.length
          ? adminClient.from('etf_prezzi_storici').select('isin, anno, mese, prezzo').in('isin', isins)
          : Promise.resolve({ data: [] }),
        adminClient.from('scenari').select('*').eq('user_id', userId),
        adminClient.from('broker').select('*').eq('user_id', userId),
        adminClient.from('portafoglio_storico_annuale').select('*').eq('user_id', userId),
      ])

      return textContent({
        _meta: buildMeta(),
        etf: etfs ?? [],
        prezziStorici: prezziRes.data ?? [],
        scenari: scenariRes.data ?? [],
        broker: brokerRes.data ?? [],
        storicoAnnuale: storicoRes.data ?? [],
      })
    }
  )

  server.tool(
    'get_etf',
    'Returns the user\'s ETFs (including archived ones). Prices are not real-time. Optional: filter by broker_id.',
    { brokers: z.array(z.string()).optional().describe('Array of broker IDs to filter by') },
    async ({ brokers }) => {
      if (!userId) throw new Error('userId null')
      let query = adminClient.from('etf').select('*, acquisti(*)').eq('user_id', userId)
      if (brokers?.length) query = query.in('broker_id', brokers)
      const { data } = await query
      return textContent(data ?? [])
    }
  )

  server.tool(
    'get_prezzi_storici',
    'Returns monthly historical prices for an ETF. Verifies that the ISIN belongs to the user. Prices are not real-time.',
    { isin: z.string().describe('ETF ISIN') },
    async ({ isin }) => {
      if (!userId) throw new Error('userId null')
      const { data } = await adminClient
        .from('etf_prezzi_storici')
        .select('isin, anno, mese, prezzo, etf!inner(user_id)')
        .eq('isin', isin)
        .eq('etf.user_id', userId)
      // Rimuove il campo join dall'output
      const result = (data ?? []).map(({ etf: _, ...rest }) => rest)
      return textContent(result)
    }
  )

  server.tool(
    'get_acquisti',
    'Returns the user\'s purchases. All parameters are optional: etf_ids filters by ETF, from/to filter by ISO date (inclusive).',
    {
      etf_ids: z.array(z.string()).optional().describe('Array of ETF IDs'),
      from:    z.string().optional().describe('Inclusive ISO date (e.g. 2024-01-01)'),
      to:      z.string().optional().describe('Inclusive ISO date (e.g. 2024-12-31)'),
    },
    async ({ etf_ids, from, to }) => {
      if (!userId) throw new Error('userId null')
      let query = adminClient
        .from('acquisti')
        .select('*, etf!inner(user_id)')
        .eq('etf.user_id', userId)
      if (etf_ids?.length) query = query.in('etf_id', etf_ids)
      if (from) query = query.gte('data', from)
      if (to)   query = query.lte('data', to)
      const { data } = await query
      const result = (data ?? []).map(({ etf: _, ...rest }) => rest)
      return textContent(result)
    }
  )

  server.tool(
    'get_storico',
    'Returns the user\'s portafoglio_storico_annuale data. Optional: filter by year.',
    { anno: z.number().int().optional().describe('Year (e.g. 2024)') },
    async ({ anno }) => {
      if (!userId) throw new Error('userId null')
      let query = adminClient
        .from('portafoglio_storico_annuale')
        .select('*')
        .eq('user_id', userId)
      if (anno) query = query.eq('anno', anno)
      const { data } = await query
      return textContent(data ?? [])
    }
  )

  server.tool(
    'get_calcoli',
    'Returns JS functions from calcoli.js ready to be applied by the LLM. Does not execute calculations server-side. Optional: specify a function name (e.g. "calcolaCAGR").',
    { indice: z.string().optional().describe('Function name (e.g. "calcolaCAGR", "calcolaTWRR")') },
    async ({ indice }) => {
      if (indice) {
        const fn = extractFunction(calcoliSource, indice)
        if (!fn) return textContent({ error: `Funzione "${indice}" non trovata in calcoli.js` })
        return textContent({ indice, funzione: fn })
      }
      return textContent({ sorgente: calcoliSource })
    }
  )

  return server
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const userId = await resolveUserId(req.headers['authorization'])
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const server = buildMcpServer(userId)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}
