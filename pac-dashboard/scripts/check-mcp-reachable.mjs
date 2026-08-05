#!/usr/bin/env node
/**
 * Verifica che l'endpoint MCP sia raggiungibile dai client AI attraverso Cloudflare.
 *
 * Contesto (PAC-127): la regola managed Cloudflare "Block AI bots" blocca le richieste
 * con User-Agent `Claude-User` (il gateway server-side di claude.ai) PRIMA che
 * raggiungano Vercel. Il sintomo lato client è un McpAuthorizationError fuorviante
 * ("the integration rejected the credentials"), mentre lato server non compare alcun
 * log: è proprio l'assenza di log la firma del guasto. Il fix è una WAF Skip rule su
 * /api/mcp, che vive nella dashboard Cloudflare e non nel repo — quindi può regredire
 * silenziosamente (ricostruzione zona, aggiornamento del managed ruleset, ecc.).
 *
 * Il test invia la stessa probe non autenticata che manda claude.ai e verifica di
 * ricevere il nostro 401 applicativo invece di un blocco Cloudflare. Non serve alcun
 * token né segreto: può girare ovunque.
 *
 * Esecuzione:
 *   node scripts/check-mcp-reachable.mjs
 *   node scripts/check-mcp-reachable.mjs https://etflens.app
 *   CHECK_BASE_URL=https://etflens.app node scripts/check-mcp-reachable.mjs
 *
 * Exit code: 0 = raggiungibile, 1 = bloccato o risposta inattesa.
 */

const BASE_URL = (process.argv[2] ?? process.env.CHECK_BASE_URL ?? 'https://etflens.app').replace(/\/$/, '')
const TIMEOUT_MS = 15_000

// User-Agent del gateway server-side di claude.ai: è questo che la regola AI-bots matcha.
const UA_AI_CLIENT = 'Claude-User'
// UA neutro di controllo: non matcha la regola AI-bots. Serve a distinguere
// "bloccato dalla regola AI-bots" da "sito giù / rotto per tutti".
const UA_CONTROL = 'etflens-healthcheck/1.0'

let passed = 0
let failed = 0

function ok(label) {
  console.log(`   ✓ ${label}`)
  passed++
}

function fail(label, msg) {
  console.error(`   ✗ ${label}: ${msg}`)
  failed++
}

async function request(path, { method = 'POST', ua, body } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'User-Agent': ua,
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      redirect: 'manual',
    })
    const text = await res.text()
    return { status: res.status, headers: res.headers, text }
  } finally {
    clearTimeout(timer)
  }
}

// Probe identica a quella che claude.ai invia per prima: initialize senza token.
const INITIALIZE_BODY = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'etflens-reachability-check', version: '1.0.0' },
  },
}

// Marker presenti nelle interstitial di blocco/challenge Cloudflare.
const CF_BLOCK_MARKERS = [
  'Sorry, you have been blocked',
  'Attention Required!',
  'Cloudflare Ray ID',
  'cf-error-details',
  'error code: 1010',
]

/**
 * Distingue il nostro 401 applicativo da un blocco Cloudflare.
 *
 * Attribuire la colpa a Cloudflare va fatto solo con prove concrete: `server: cloudflare`
 * e `cf-ray` sono presenti su OGNI risposta (il dominio è dietro proxy) e non provano
 * nulla, così come un generico 4xx con body HTML — che può benissimo arrivare
 * dall'origin (route rinominata, 404 di Vercel, 405). Una diagnosi sbagliata qui manda
 * a caccia della regola WAF quando il problema è altrove: esattamente l'errore che ha
 * fatto perdere ore in PAC-127. Quindi: `blockedByCloudflare` solo su firme certe,
 * altrimenti si segnala l'anomalia senza indicarne la causa.
 */
function classify({ status, headers, text }) {
  const wwwAuth = headers.get('www-authenticate') ?? ''
  const mitigated = headers.get('cf-mitigated')
  const cfRay = headers.get('cf-ray') ?? 'n/d'
  const hasBlockMarker = CF_BLOCK_MARKERS.some(m => text.includes(m))

  if (status === 401 && wwwAuth.includes('Bearer') && wwwAuth.includes('resource_metadata')) {
    return { healthy: true, blockedByCloudflare: false, reason: '401 applicativo con WWW-Authenticate corretto' }
  }
  if (mitigated) {
    return { healthy: false, blockedByCloudflare: true, reason: `challenge Cloudflare (cf-mitigated: ${mitigated}, cf-ray ${cfRay})` }
  }
  if (hasBlockMarker) {
    return { healthy: false, blockedByCloudflare: true, reason: `interstitial di blocco Cloudflare — HTTP ${status}, cf-ray ${cfRay}` }
  }
  if (status === 403) {
    // 403 senza marker: quasi sempre edge, ma non certo — non lo do per assodato.
    return { healthy: false, blockedByCloudflare: true, reason: `HTTP 403 senza interstitial riconoscibile (cf-ray ${cfRay}) — probabile blocco edge` }
  }
  if (status === 401) {
    return { healthy: false, blockedByCloudflare: false, reason: `401 ma senza WWW-Authenticate valido (ricevuto: "${wwwAuth}")` }
  }
  return { healthy: false, blockedByCloudflare: false, reason: `risposta inattesa HTTP ${status} — body: ${text.slice(0, 120)}` }
}

async function run() {
  console.log(`Verifica raggiungibilità MCP su: ${BASE_URL}`)
  if (/vercel\.app$/.test(new URL(BASE_URL).hostname)) {
    console.error('\nERRORE: il target è un dominio *.vercel.app, che bypassa Cloudflare.')
    console.error('Questo test ha senso solo sul dominio pubblico dietro proxy Cloudflare.')
    process.exit(1)
  }
  console.log()

  // ── 1. Probe con UA del client AI (il caso che regredisce) ──────────────────
  console.log(`1. POST /api/mcp con User-Agent "${UA_AI_CLIENT}" (probe non autenticata)`)
  let aiBlockedByCloudflare = false
  try {
    const res = await request('/api/mcp', { ua: UA_AI_CLIENT, body: INITIALIZE_BODY })
    const verdict = classify(res)
    if (verdict.healthy) {
      ok(`endpoint raggiungibile dai client AI — ${verdict.reason}`)
    } else {
      aiBlockedByCloudflare = verdict.blockedByCloudflare
      fail('endpoint NON raggiungibile dai client AI', verdict.reason)
    }
  } catch (err) {
    fail('richiesta fallita', err.name === 'AbortError' ? `timeout dopo ${TIMEOUT_MS}ms` : err.message)
  }
  console.log()

  // ── 2. Controllo con UA neutro (isola la causa) ─────────────────────────────
  console.log(`2. POST /api/mcp con User-Agent neutro "${UA_CONTROL}" (controllo)`)
  let controlHealthy = false
  try {
    const res = await request('/api/mcp', { ua: UA_CONTROL, body: INITIALIZE_BODY })
    const verdict = classify(res)
    if (verdict.healthy) {
      controlHealthy = true
      ok(`endpoint raggiungibile con UA neutro — ${verdict.reason}`)
    } else {
      fail('endpoint non raggiungibile nemmeno con UA neutro', verdict.reason)
    }
  } catch (err) {
    fail('richiesta di controllo fallita', err.name === 'AbortError' ? `timeout dopo ${TIMEOUT_MS}ms` : err.message)
  }
  console.log()

  // ── 3. Discovery OAuth con UA del client AI ─────────────────────────────────
  // claude.ai le interroga durante il flusso: se una regola più stretta le bloccasse,
  // la connessione fallirebbe prima ancora del token exchange.
  const discoveryPaths = ['/.well-known/oauth-protected-resource', '/.well-known/oauth-authorization-server']
  for (const [i, path] of discoveryPaths.entries()) {
    console.log(`${3 + i}. GET ${path} con User-Agent "${UA_AI_CLIENT}"`)
    try {
      const res = await request(path, { method: 'GET', ua: UA_AI_CLIENT })
      if (res.status === 200) ok('discovery raggiungibile')
      else fail('discovery non raggiungibile', `HTTP ${res.status} — body: ${res.text.slice(0, 120)}`)
    } catch (err) {
      fail('discovery non raggiungibile', err.name === 'AbortError' ? `timeout dopo ${TIMEOUT_MS}ms` : err.message)
    }
    console.log()
  }

  // ── Esito ───────────────────────────────────────────────────────────────────
  console.log(`Risultato: ${passed} passati, ${failed} falliti`)

  if (aiBlockedByCloudflare && controlHealthy) {
    console.error('\nDIAGNOSI: il blocco colpisce solo lo User-Agent dei client AI, mentre un UA')
    console.error('neutro passa. È la firma della regola managed Cloudflare "Block AI bots"')
    console.error('(cfr. PAC-127). Verificare che la WAF Custom rule di Skip su /api/mcp sia')
    console.error('attiva e posizionata sopra le managed rules:')
    console.error('  Security → WAF → Custom rules → expression:')
    console.error('    starts_with(http.request.uri.path, "/api/mcp")')
    console.error('  Action: Skip → ruleset managed che include "Block AI bots"')
  }

  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Errore inatteso:', err)
  process.exit(1)
})
