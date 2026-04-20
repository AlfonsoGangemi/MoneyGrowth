import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
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
  { nome: 'totaleInvestito',            descrizione: 'Totale capitale investito (importoInvestito + fee)',                                          funzione: 'totaleInvestito(acquisti)' },
  { nome: 'totaleQuote',                descrizione: 'Totale quote accumulate',                                                                     funzione: 'totaleQuote(acquisti)' },
  { nome: 'valoreAttuale',              descrizione: 'Valore attuale del portafoglio al prezzo corrente',                                           funzione: 'valoreAttuale(acquisti, prezzoCorrente)' },
  { nome: 'calcolaROI',                 descrizione: 'ROI percentuale: (valoreAttuale - investito) / investito * 100',                             funzione: 'calcolaROI(acquisti, prezzoCorrente)' },
  { nome: 'calcolaRendimentoNetto',     descrizione: 'Rendimento netto in €: valoreAttuale - totaleInvestito',                                     funzione: 'calcolaRendimentoNetto(acquisti, prezzoCorrente)' },
  { nome: 'calcolaDurataM',             descrizione: 'Durata in mesi dal primo acquisto ad oggi',                                                  funzione: 'calcolaDurataM(acquisti)' },
  { nome: 'calcolaCAGR',                descrizione: 'CAGR: tasso di crescita annuo composto',                                                     funzione: 'calcolaCAGR(acquisti, prezzoCorrente)' },
  { nome: 'calcolaTWRR',                descrizione: 'TWRR approssimato: rendimento time-weighted per flussi PAC',                                 funzione: 'calcolaTWRR(acquisti, prezzoCorrente)' },
  { nome: 'calcolaATWRR',               descrizione: 'ATWRR: media geometrica annualizzata del TWRR',                                              funzione: 'calcolaATWRR(acquisti, prezzoCorrente)' },
  { nome: 'calcolaIRR',                 descrizione: 'XIRR: tasso interno di rendimento per flussi irregolari (Newton-Raphson, annualizzato %)',   funzione: 'calcolaIRR(acquisti, prezzoCorrente)' },
  { nome: 'serieStorica',               descrizione: 'Serie storica {data, valore} basata sui prezzi di acquisto come proxy NAV',                  funzione: 'serieStorica(acquisti, prezzoCorrente)' },
  { nome: 'serieStoricaAggregata',      descrizione: 'Serie storica aggregata multi-ETF con timeline unificata e carry-forward',                   funzione: 'serieStoricaAggregata(etfList)' },
  { nome: 'serieStoricaDaPrezziStorici',descrizione: 'Serie storica mensile da etf_prezzi_storici con fallback a 3 livelli',                       funzione: 'serieStoricaDaPrezziStorici(etfList, prezziStorici)' },
  { nome: 'calcolaMaxDrawdown',         descrizione: 'Max Drawdown: massima perdita percentuale dal picco (ritorna valore negativo)',               funzione: 'calcolaMaxDrawdown(serie)' },
  { nome: 'calcolaVolatilita',          descrizione: 'Volatilità mensile annualizzata: std dev rendimenti mensili * sqrt(12)',                      funzione: 'calcolaVolatilita(serie)' },
  { nome: 'calcolaProiezione',          descrizione: 'Proiezione con capitalizzazione composta mensile (PAC futuro)',                               funzione: 'calcolaProiezione(valoreIniziale, versamentoMensile, rendimentoAnnuo, orizzonteAnni, dataInizio)' },
  { nome: 'indicatoriPortafoglio',      descrizione: 'Aggregati portafoglio: totInvestito, totValore, roi, netto, durataM, cagr, totFee',          funzione: 'indicatoriPortafoglio(etfList)' },
  { nome: 'distribuzioneAssetClass',    descrizione: 'Distribuzione percentuale per asset class, ordinata per peso decrescente',                   funzione: 'distribuzioneAssetClass(etfList, brokerFiltro)' },
]

function buildMeta() {
  return {
    generated_at: new Date().toISOString(),
    avviso: 'I prezzi (prezzoCorrente) riflettono l\'ultima sincronizzazione manuale nell\'app. Non sono prezzi di mercato in tempo reale.',
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

async function resolveUserIdFromApiKey(apiKey) {
  if (!apiKey?.startsWith('pac_')) return null
  const hash = createHash('sha256').update(apiKey).digest('hex')
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

function buildMcpServer(userId) {
  const server = new McpServer({
    name: 'etflens-portfolio',
    version: '1.0.0',
  })

  // ── Resources ──────────────────────────────────────────────────────────────

  server.resource(
    'portfolio://broker',
    'broker',
    { mimeType: 'application/json', description: 'Array dei broker dell\'utente (inclusi archiviati). I prezzi non sono in tempo reale.' },
    async () => {
      if (!userId) throw new Error('userId null')
      const { data } = await adminClient.from('broker').select('*').eq('user_id', userId)
      return { contents: [{ uri: 'portfolio://broker', text: JSON.stringify(data ?? []) }] }
    }
  )

  server.resource(
    'portfolio://indici',
    'indici',
    { mimeType: 'application/json', description: 'Lista degli indici finanziari calcolabili tramite calcoli.js, con firma e descrizione.' },
    async () => {
      return { contents: [{ uri: 'portfolio://indici', text: JSON.stringify(INDICI) }] }
    }
  )

  server.resource(
    'portfolio://formulas/calcoli',
    'calcoli',
    { mimeType: 'text/javascript', description: 'Sorgente completo di calcoli.js. I prezzi nei dati non sono in tempo reale.' },
    async () => {
      return { contents: [{ uri: 'portfolio://formulas/calcoli', text: calcoliSource }] }
    }
  )

  // ── Tools ──────────────────────────────────────────────────────────────────

  server.tool(
    'get_portafoglio',
    'Restituisce tutti i dati del portafoglio in un unico payload (ETF con acquisti, prezzi storici, scenari, broker, storico annuale). I prezzi non sono in tempo reale.',
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
    'Restituisce gli ETF dell\'utente (inclusi archiviati). I prezzi non sono in tempo reale. Opzionale: filtra per broker_id.',
    { brokers: z.array(z.string()).optional().describe('Array di broker ID per filtrare') },
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
    'Restituisce i prezzi storici mensili per un ETF. Verifica che l\'ISIN appartenga all\'utente. I prezzi non sono in tempo reale.',
    { isin: z.string().describe('ISIN dell\'ETF') },
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
    'Restituisce gli acquisti dell\'utente. Tutti i parametri sono opzionali: etf_ids filtra per ETF, from/to filtrano per data ISO (inclusivi).',
    {
      etf_ids: z.array(z.string()).optional().describe('Array di ETF ID'),
      from:    z.string().optional().describe('Data ISO inclusiva (es. 2024-01-01)'),
      to:      z.string().optional().describe('Data ISO inclusiva (es. 2024-12-31)'),
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
    'Restituisce i dati di portafoglio_storico_annuale dell\'utente. Opzionale: filtra per anno.',
    { anno: z.number().int().optional().describe('Anno (es. 2024)') },
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
    'Restituisce funzioni JS da calcoli.js pronte per essere applicate dall\'LLM. Non esegue calcoli lato server. Opzionale: specifica il nome di una funzione (es. "calcolaCAGR").',
    { indice: z.string().optional().describe('Nome della funzione (es. "calcolaCAGR", "calcolaTWRR")') },
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

  const apiKey = req.headers['authorization']?.replace('Bearer ', '') ?? ''
  const userId = await resolveUserIdFromApiKey(apiKey)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  const server = buildMcpServer(userId)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}
