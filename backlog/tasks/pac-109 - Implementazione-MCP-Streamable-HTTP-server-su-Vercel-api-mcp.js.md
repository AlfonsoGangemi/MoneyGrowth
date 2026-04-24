---
id: PAC-109
title: 'Implementazione: MCP Streamable HTTP server su Vercel (api/mcp.js)'
status: Done
assignee: []
created_date: '2026-04-07 14:22'
updated_date: '2026-04-20 12:29'
labels:
  - backend
  - mcp
milestone: m-2
dependencies:
  - PAC-105
  - PAC-107
  - PAC-108
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Creazione dell'endpoint MCP principale che espone i dati del portafoglio via protocollo Model Context Protocol (Streamable HTTP transport, spec 2025).

## Scelte architetturali

- **Transport**: Streamable HTTP stateless (`sessionIdGenerator: undefined`) — solo POST, nessun SSE/GET, compatibile con Vercel serverless senza timeout issues
- **Dati**: raw JSON (stesso formato di `usePortafoglio.js`: camelCase) + sorgente `calcoli.js` come Resource testo
- **Calcoli**: nessuno lato server — l'LLM riceve i dati grezzi e le funzioni JS (estratte da `calcoli.js`), ragiona e calcola autonomamente
- **Auth**: header `Authorization: Bearer pac_<64hex>` → `resolveUserIdFromApiKey()` → doppio filtro user_id
- **Archiviati**: broker e ETF archiviati sono **sempre restituiti** (nessun filtro su `archiviato`); è responsabilità dell'LLM distinguerli tramite il campo apposito

## Dipendenza NPM

```json
"@modelcontextprotocol/sdk": "^1.x"
```

Aggiunto a `package.json` (dependencies, non devDependencies — serve a runtime Vercel).

## Resources esposte

| URI | Contenuto | MIME | Note |
|---|---|---|---|
| `portfolio://broker` | Array broker (inclusi archiviati) | `application/json` | Dati quasi-statici, adatti a Resource |
| `portfolio://indici` | Array `{nome, descrizione, funzione}` degli indici calcolabili | `application/json` | Lista statica estratta da `calcoli.js` |
| `portfolio://formulas/calcoli` | Sorgente completo di `calcoli.js` | `text/javascript` | Riferimento completo per l'LLM |

## Tools esposti

### `get_portafoglio()` — shortcut completo
Nessun input. Ritorna tutti i dati del portafoglio in un unico payload (ottimale per warm-up sessione):
- ETF + acquisti embedded (inclusi archiviati)
- Prezzi storici
- Scenari
- Broker (inclusi archiviati)
- Storico annuale portafoglio
- Campo `_meta`

### `get_etf(brokers?: string[])`
Input opzionale: array di broker ID/nome. Ritorna gli ETF dell'utente filtrati per broker (se specificati), inclusi quelli archiviati. Se `brokers` è omesso, ritorna tutti gli ETF.

### `get_prezzi_storici(isin: string)`
Input: ISIN obbligatorio. Ritorna array `{isin, anno, mese, prezzo}` per quell'ETF. Verificato che l'ISIN appartenga all'utente autenticato (doppio filtro via join su `etf.user_id`).

### `get_acquisti(etf_ids?: string[], from?: string, to?: string)`
Input tutti opzionali:
- `etf_ids`: array di ETF ID per filtrare gli acquisti
- `from`: data ISO (inclusiva)
- `to`: data ISO (inclusiva)

Se tutti omessi, ritorna tutti gli acquisti dell'utente.

### `get_storico(anno?: number)`
Input opzionale: anno (es. `2024`). Ritorna i dati di `portafoglio_storico_annuale` filtrati per anno (se specificato) o tutti. Utile per velocizzare i calcoli di performance senza rielaborare tutti gli acquisti.

### `get_calcoli(indice?: string)`
Input opzionale: nome dell'indice (es. `"CAGR"`, `"TWRR"`, `"drawdown"`). Ritorna la funzione JS estratta da `calcoli.js` per quell'indice, pronta per essere applicata dall'LLM. Se `indice` è omesso, ritorna tutte le funzioni disponibili. **Non esegue calcoli lato server.**

## Struttura `api/mcp.js`

```js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// Lettura sorgente calcoli.js a cold start (una volta per istanza)
const calcoliSource = readFileSync(join(__dirname, '../src/utils/calcoli.js'), 'utf8')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // 1. Auth
  const apiKey = req.headers['authorization']?.replace('Bearer ', '')
  const userId = await resolveUserIdFromApiKey(apiKey)
  if (!userId) return res.status(401).json({ error: 'Unauthorized' })

  // 2. MCP server per questa richiesta (stateless)
  const server = buildMcpServer(userId, calcoliSource)
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}
```

## Query Supabase — note implementative

Tutte le query usano `SUPABASE_SERVICE_KEY` (bypassa RLS) **e** il filtro esplicito `.eq('user_id', userId)`.

**Nessun filtro su `archiviato`**: broker e ETF archiviati sono restituiti sempre; l'LLM li distingue tramite il campo `archiviato: true`.

```js
// get_portafoglio: query in parallelo
const [etfRes, prezziRes, scenariRes, brokerRes, storicoRes] = await Promise.all([
  adminClient.from('etf').select('*, acquisti(*)').eq('user_id', userId),
  adminClient.from('etf_prezzi_storici').select('isin, anno, mese, prezzo').in('isin', isins),
  adminClient.from('scenari').select('*').eq('user_id', userId),
  adminClient.from('broker').select('*').eq('user_id', userId),
  adminClient.from('portafoglio_storico_annuale').select('*').eq('user_id', userId),
])

// get_etf con filtro broker opzionale
let query = adminClient.from('etf').select('*, acquisti(*)').eq('user_id', userId)
if (brokers?.length) query = query.in('broker_id', brokers)

// get_prezzi_storici — verifica ownership via join
adminClient.from('etf_prezzi_storici')
  .select('isin, anno, mese, prezzo, etf!inner(user_id)')
  .eq('isin', isin)
  .eq('etf.user_id', userId)
```

## Campo _meta nell'output

```json
{
  "_meta": {
    "generated_at": "2026-04-18T10:00:00Z",
    "avviso": "I prezzi (prezzoCorrente) riflettono l'ultima sincronizzazione manuale nell'app. Non sono prezzi di mercato in tempo reale.",
    "archiviati_inclusi": true
  }
}
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 POST /api/mcp risponde a una richiesta MCP initialize valida con le capabilities del server
- [x] #2 Resource portfolio://broker ritorna tutti i broker dell'utente inclusi quelli archiviati
- [x] #3 Resource portfolio://indici ritorna array {nome, descrizione, funzione} degli indici disponibili in calcoli.js
- [x] #4 Resource portfolio://formulas/calcoli ritorna il sorgente completo di calcoli.js
- [x] #5 Tool get_portafoglio() ritorna payload completo (etf+acquisti, prezzi storici, scenari, broker, storico annuale) con campo _meta
- [x] #6 Tool get_etf() senza parametri ritorna tutti gli ETF inclusi archiviati; con brokers[] filtra per broker
- [x] #7 Tool get_prezzi_storici(isin) ritorna i prezzi storici verificando che l'ISIN appartenga all'utente autenticato
- [x] #8 Tool get_acquisti() con parametri opzionali etf_ids[], from, to filtra correttamente gli acquisti
- [x] #9 Tool get_storico() senza parametri ritorna tutto portafoglio_storico_annuale; con anno filtra per anno
- [x] #10 Tool get_calcoli() senza parametri ritorna tutte le funzioni; con indice ritorna la funzione JS specifica estratta da calcoli.js
- [x] #11 Tutte le query Supabase hanno .eq('user_id', userId) come primo filtro
- [x] #12 Nessun filtro su archiviato in nessuna query — gli archiviati sono sempre restituiti
- [x] #13 Nessun header CORS nell'endpoint
- [x] #14 SUPABASE_SERVICE_KEY letta da process.env (non import.meta.env)
- [x] #15 package.json include @modelcontextprotocol/sdk nelle dependencies (non devDependencies)
- [x] #16 vercel.json include functions.api/mcp.js.includeFiles: src/utils/calcoli.js
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## resolveUserIdFromApiKey — filtro corretto

Con hard delete (nessun `revoked_at`), il lookup filtra solo su `expires_at > now()`. Le chiavi cancellate non esistono più in tabella. Il lookup per `key_hash` usa l'indice implicito creato dal vincolo UNIQUE.

```js
async function resolveUserIdFromApiKey(apiKey) {
  if (!apiKey?.startsWith('pac_')) return null
  const hash = createHash('sha256').update(apiKey).digest('hex')
  const { data } = await adminClient
    .from('user_api_keys')
    .select('user_id, id')
    .eq('key_hash', hash)
    .gt('expires_at', new Date().toISOString())
    // nessun filtro revoked_at — il campo non esiste
    .single()
  if (!data) return null
  // Aggiorna last_used_at in background (fire-and-forget)
  adminClient
    .from('user_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
  return data.user_id
}
```
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Creato `api/mcp.js`: McpServer stateless (StreamableHTTPServerTransport, sessionIdGenerator: undefined), auth via `resolveUserIdFromApiKey` (SHA256 + expires_at > now + last_used_at fire-and-forget), 3 resources (broker, indici, formulas/calcoli), 6 tools (get_portafoglio, get_etf, get_prezzi_storici, get_acquisti, get_storico, get_calcoli). Tutti i tool usano JSON.stringify(), nessun CORS, _meta in get_portafoglio, guard `if (!userId) throw` in ogni tool/resource. `readFileSync` di calcoli.js a module init via fileURLToPath (ESM-safe). SDK installato come dependency. vercel.json aggiornato con functions.api/mcp.js.includeFiles.
<!-- SECTION:FINAL_SUMMARY:END -->
