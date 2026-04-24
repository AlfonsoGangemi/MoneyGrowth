# Integrazione MCP — ETF Lens

Questo documento descrive l'architettura, il flusso di autenticazione, le scelte di protocollo, le risorse esposte e il modello di sicurezza del layer MCP (Model Context Protocol) per ETF Lens.

---

## Indice

1. [Obiettivo](#obiettivo)
2. [Architettura generale](#architettura-generale)
3. [Autenticazione: API Key](#autenticazione-api-key)
4. [Protocollo MCP: scelte implementative](#protocollo-mcp-scelte-implementative)
5. [Resources esposte](#resources-esposte)
6. [Tools esposti](#tools-esposti)
7. [Schema Supabase](#schema-supabase)
8. [Configurazione Vercel](#configurazione-vercel)
9. [Variabili d'ambiente](#variabili-dambiente)
10. [Modello di sicurezza](#modello-di-sicurezza)
11. [Carico server e rate limiting](#carico-server-e-rate-limiting)
12. [Ordine di implementazione](#ordine-di-implementazione)
13. [Configurazione Claude Desktop](#configurazione-claude-desktop)
14. [Task di backlog correlati](#task-di-backlog-correlati)

---

## Obiettivo

Il layer MCP espone i dati di portafoglio dell'utente autenticato a un LLM (es. Claude Desktop), consentendogli di rispondere a domande finanziarie personalizzate: rendimento storico, confronto scenari, analisi di drawdown, distribuzione asset class, proiezioni future, ecc.

L'LLM riceve:
- dati grezzi del portafoglio (ETF, acquisti, scenari, prezzi storici)
- il codice sorgente di `calcoli.js` (formule finanziarie)
- metadati di freschezza dei dati

Il calcolo degli indicatori avviene **lato LLM**, non lato server.

---

## Architettura generale

```
Claude Desktop
     │
     │  POST /api/mcp
     │  Authorization: Bearer pac_<32-byte-hex>
     ▼
Vercel Serverless Function (api/mcp.js)
     │
     ├── Valida API key → sha256 hash → query su user_api_keys
     ├── Recupera userId
     ├── Istanzia McpServer con userId
     │
     ├── Resource: portfolio://data         ← query Supabase (service key)
     ├── Resource: portfolio://formulas/calcoli ← readFileSync calcoli.js
     │
     └── Tool: get_etf_details(isin)
     │
     ▼
Supabase (PostgreSQL)
  tabelle: etf, acquisti, scenari, config, broker,
           portafoglio_storico_annuale, asset_class,
           etf_prezzi_storici, user_api_keys
```

**Flusso di una richiesta MCP:**
1. Claude Desktop invia POST a `/api/mcp` con la propria sessione MCP nel body e `Authorization: Bearer pac_<key>` nell'header.
2. `api/mcp.js` calcola `sha256(apiKey)` e cerca la riga corrispondente in `user_api_keys` (non scaduta, non revocata).
3. Se valida, aggiorna `last_used_at` e ricava `user_id`.
4. Istanzia `McpServer` con tutte le query filtrate per `user_id`.
5. Risponde in formato MCP (JSON) con le risorse/strumenti richiesti.

---

## Autenticazione: API Key

### Formato chiave

```
pac_<64 caratteri hex>
```

- Lunghezza totale: 68 caratteri
- Prefisso `pac_` per identificazione immediata
- 32 byte di entropia (`crypto.randomBytes(32).toString('hex')`)

### Ciclo di vita

| Evento | Dettaglio |
|---|---|
| Generazione | `/api/keys/generate` (POST, JWT richiesto) |
| Visualizzazione | La chiave in chiaro viene restituita **una sola volta** |
| Storage | Solo l'hash sha256 è salvato in DB; la chiave plain non è mai persistita |
| Scadenza | 90 giorni dalla creazione (`expires_at`) |
| Revoca | Soft delete (`revoked_at = now()`) tramite `/api/keys/:keyId` (DELETE) |
| Limite | Massimo 5 chiavi attive per utente (enforced via DB trigger) |

### Endpoint chiavi

```
POST   /api/keys/generate       Genera nuova chiave (JWT in Authorization)
DELETE /api/keys/:keyId         Revoca chiave (JWT in Authorization)
```

**Nota:** questi endpoint usano il **JWT Supabase** dell'utente (ottenuto da `supabase.auth.getSession()`), non la API key MCP. La API key MCP è usata solo dall'LLM verso `/api/mcp`.

### Validazione server-side

```js
// api/keys/generate.js
const { data: { user } } = await supabase.auth.getUser(jwt)
// NON fidarsi mai di user_id dal body della richiesta
```

### Risoluzione API key → userId

```js
const hash = createHash('sha256').update(apiKey).digest('hex')
const { data } = await supabase
  .from('user_api_keys')
  .select('user_id')
  .eq('key_hash', hash)
  .is('revoked_at', null)
  .gt('expires_at', new Date().toISOString())
  .single()
```

---

## Protocollo MCP: scelte implementative

### Trasporto: Streamable HTTP (spec 2025)

Il server MCP usa il trasporto **Streamable HTTP** in modalità **stateless** (senza SSE, senza session ID). Ogni richiesta è indipendente.

**Perché non SSE:** Vercel serverless non supporta connessioni long-lived. Il trasporto stateless è pienamente compatibile.

```js
const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: undefined  // modalità stateless
})
```

### POST-only

L'endpoint `/api/mcp` accetta **solo POST**. Tutte le altre method restituiscono `405 Method Not Allowed`.

### Nessun CORS

L'endpoint MCP **non emette header CORS**. I client MCP (Claude Desktop) non sono browser; aggiungere CORS sarebbe errato e potenzialmente pericoloso (esporrebbe l'endpoint a chiamate browser non autorizzate).

Gli altri endpoint `api/*.js` del progetto usano `ALLOWED_ORIGIN` per CORS — questo pattern **non si applica** a `api/mcp.js`.

### Libreria

```
@modelcontextprotocol/sdk   (Node.js only, runtime dependency)
```

Installata in `dependencies` (non `devDependencies`) perché gira su Vercel. Non viene importata da `src/` → nessun impatto sul bundle Vite.

---

## Resources esposte

### `portfolio://data`

Dati completi del portafoglio dell'utente.

**Struttura risposta:**

```json
{
  "_meta": {
    "generated_at": "2025-01-15T10:30:00Z",
    "avviso": "prezzoCorrente è aggiornato manualmente dall'utente, non è un prezzo di mercato in tempo reale"
  },
  "etf": [...],
  "acquisti": [...],
  "scenari": [...],
  "config": {...},
  "broker": [...],
  "storici": [...],
  "assetClasses": [...],
  "prezziStorici": [...]
}
```

**Tabelle Supabase interrogate:**

| Tabella | Filtro |
|---|---|
| `etf` | `user_id = userId` |
| `acquisti` | `user_id = userId` |
| `scenari` | `user_id = userId` |
| `config` | `user_id = userId` |
| `broker` | `user_id = userId` |
| `portafoglio_storico_annuale` | `user_id = userId` |
| `asset_class` | nessun filtro (tabella condivisa, read-only) |
| `etf_prezzi_storici` | join su `etf.user_id = userId` |

**Importante:** tutte le query usano `SUPABASE_SERVICE_KEY` (bypassa RLS) **e** il filtro esplicito `.eq('user_id', userId)`. La doppia protezione è intenzionale.

### `portfolio://formulas/calcoli`

Codice sorgente di `src/utils/calcoli.js` in formato `text/javascript`.

Consente all'LLM di applicare le stesse formule usate dalla web app: ROI, CAGR, TWRR, ATWRR, IRR, drawdown massimo, volatilità, proiezioni, ecc.

Il file viene letto con `readFileSync` al momento della richiesta. Vedi sezione [Configurazione Vercel](#configurazione-vercel) per il requisito critico `includeFiles`.

---

## Tools esposti

### `get_etf_details`

Recupera i dettagli di un singolo ETF con tutti i suoi acquisti.

**Input:**
```json
{ "isin": "IE00B4L5Y983" }
```

**Output:**
```json
{
  "etf": { ... },
  "acquisti": [ ... ]
}
```

Filtrato per `user_id`: l'LLM non può accedere a ETF di altri utenti anche specificando un ISIN corretto.

---

## Schema Supabase

### Tabella `user_api_keys`

```sql
create table user_api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  key_hash     text not null unique,
  label        text,
  created_at   timestamptz default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz,
  expires_at   timestamptz default now() + interval '90 days'
);

-- Indice per lookup rapido durante l'autenticazione
create index on user_api_keys(key_hash)
  where revoked_at is null;

-- RLS
alter table user_api_keys enable row level security;

create policy "owner read" on user_api_keys
  for select using (user_id = auth.uid());

create policy "owner delete" on user_api_keys
  for delete using (user_id = auth.uid());
```

### Trigger: limite 5 chiavi attive per utente

```sql
create or replace function check_api_key_limit()
returns trigger language plpgsql as $$
begin
  if (
    select count(*) from user_api_keys
    where user_id = new.user_id
      and revoked_at is null
      and expires_at > now()
  ) >= 5 then
    raise exception 'Limite massimo di 5 chiavi API attive raggiunto';
  end if;
  return new;
end;
$$;

create trigger enforce_api_key_limit
  before insert on user_api_keys
  for each row execute function check_api_key_limit();
```

---

## Configurazione Vercel

### `vercel.json` — aggiunta richiesta

```json
{
  "functions": {
    "api/mcp.js": {
      "includeFiles": "src/utils/calcoli.js"
    }
  }
}
```

**Perché è critico:** le Vercel Serverless Functions non includono la directory `src/` nel bundle di deployment. Senza questa configurazione, `readFileSync('src/utils/calcoli.js')` fallisce silenziosamente in produzione (file non trovato).

Questa configurazione include esplicitamente il file nel bundle della funzione `api/mcp.js`. Il percorso usato nel codice è relativo a `__dirname`:

```js
const calcoliSource = readFileSync(
  join(__dirname, '../src/utils/calcoli.js'),
  'utf8'
)
```

### Routing: nessun conflitto

Le funzioni serverless in `api/` hanno priorità sulle rewrite SPA definite in `vercel.json`. Il catch-all `/(.*) → /index.html` non interferisce con `/api/mcp`, `/api/keys/generate` o `/api/keys/:keyId`.

---

## Variabili d'ambiente

| Variabile | Dove usata | Note |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend + SSR | Già esistente |
| `VITE_SUPABASE_ANON_KEY` | Frontend + SSR | Già esistente |
| `SUPABASE_URL` | `api/mcp.js`, `api/keys/*.js` | Stesso valore di `VITE_SUPABASE_URL`, senza prefisso |
| `SUPABASE_SERVICE_KEY` | `api/mcp.js` | **Nuova.** Service role key Supabase. **MAI con prefisso `VITE_`** |
| `ALLOWED_ORIGIN` | `api/*.js` esistenti | Non usato da `api/mcp.js` |

**Attenzione:** `SUPABASE_SERVICE_KEY` bypassa tutte le RLS di Supabase. Non deve mai essere esposta al client browser. L'assenza del prefisso `VITE_` garantisce che Vite non la includa nel bundle frontend.

---

## Modello di sicurezza

### Autenticazione e autorizzazione (A1–A3)

| ID | Rischio | Mitigazione |
|---|---|---|
| A1 | Furto API key | Chiave visualizzata una sola volta; hash-only in DB; HTTPS enforced |
| A2 | Accesso dati di altro utente | `user_id` mai fidato dal client; doppio filtro (service key + `.eq('user_id', ...)`) |
| A3 | Brute force API key | 32 byte entropia (2^256 spazio); index parziale su `key_hash where revoked_at is null`; rate limiting (PAC-69) |

### Crittografia e storage (C1–C3)

| ID | Rischio | Mitigazione |
|---|---|---|
| C1 | API key leakage da DB | Solo sha256 hash persistito; plain key non recuperabile |
| C2 | Service key exposure | Variabile senza `VITE_`; non inclusa nel bundle Vite; non loggata |
| C3 | Key in log/monitoring | Non loggare mai `apiKey` o `key_hash`; attenzione a Sentry breadcrumbs |

### Middleware e validazione (M1–M4)

| ID | Rischio | Mitigazione |
|---|---|---|
| M1 | JWT forgery su `/api/keys/*` | `supabase.auth.getUser(jwt)` server-side; mai fidarsi del body |
| M2 | ISIN injection / query injection | Supabase client usa prepared statements; nessuna query raw |
| M3 | Prompt injection via nomi ETF | Output strutturato JSON; LLM riceve dati, non istruzioni da DB |
| M4 | Accesso MCP da browser | Nessun header CORS → browser bloccati da same-origin policy |

### Backend e infrastruttura (B1–B2)

| ID | Rischio | Mitigazione |
|---|---|---|
| B1 | `calcoli.js` non trovato in prod | `vercel.json` `functions.includeFiles` (vedi sezione dedicata) |
| B2 | `@sentry/react` in Node.js | `calcoli.js` letto come testo (`readFileSync`), mai importato/eseguito server-side |

### Rate limiting (nota aperta)

L'endpoint `/api/mcp` non ha rate limiting affidabile in produzione multi-istanza Vercel (stesso problema degli altri `api/*.js` documentato in PAC-69). Per uso mono-utente il rischio è accettabile. Una soluzione robusta richiede Vercel KV o Upstash Redis (PAC-69).

---

## Carico server e rate limiting

### Stima carico per richiesta MCP

| Operazione | Costo stimato |
|---|---|
| Lookup API key (1 query indexed) | ~5ms |
| Aggiornamento `last_used_at` | ~5ms |
| Query portafoglio (8 tabelle) | ~50–150ms |
| `readFileSync` calcoli.js (~600 righe) | <1ms (hot dopo primo cold start) |
| Serializzazione JSON | <5ms |
| **Totale** | **~70–200ms** |

Le query sono effettuate in parallelo dove possibile (`Promise.all`). L'LLM tipicamente chiama `/api/mcp` una volta per sessione di chat (resource fetch), non continuamente.

### Cold start Vercel

La funzione `api/mcp.js` include `@modelcontextprotocol/sdk` e il client Supabase. Il cold start stimato è ~300–600ms. Dopo il warm-up, le richieste successive sono nel range normale.

---

## Ordine di implementazione

Le implementazioni seguono le dipendenze logiche:

```
PAC-104  Schema DB user_api_keys + trigger + RLS
    │
    ├── PAC-106  api/keys/generate.js + api/keys/[keyId].js
    │       │
PAC-108  api/mcp.js (McpServer, Resources, Tools)
    │
    ├── PAC-105  src/components/ApiKeyPanel.jsx (UI gestione chiavi)
    ├── PAC-107  Dashboard.jsx + vercel.json + package.json
    │
PAC-109  Test end-to-end con Claude Desktop
    │
PAC-110  Documentazione e monitoraggio
```

**PAC-105 e PAC-107 possono procedere in parallelo dopo PAC-106.**

---

## Configurazione Claude Desktop

Dopo aver generato una API key dall'interfaccia web, aggiungere in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "etflens": {
      "url": "https://etflens.app/api/mcp",
      "headers": {
        "Authorization": "Bearer pac_<la-tua-chiave>"
      }
    }
  }
}
```

Il file di configurazione si trova in:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Esempio di utilizzo

Una volta connesso, Claude Desktop può rispondere a domande come:
- *"Qual è il mio ROI attuale sul portafoglio complessivo?"*
- *"Qual ETF ha avuto il maggior drawdown?"*
- *"Confronta i tre scenari di proiezione futura al 2035."*
- *"Quanto ho investito in ETF azionari rispetto agli obbligazionari?"*

### Avviso freschezza dati

Ogni risposta dell'LLM che usa `portfolio://data` deve tenere conto del campo `_meta.avviso`:

> `prezzoCorrente` è aggiornato manualmente dall'utente, non è un prezzo di mercato in tempo reale. I calcoli di rendimento si basano sul prezzo dell'ultimo aggiornamento manuale.

---

## Task di backlog correlati

| Task | Descrizione |
|---|---|
| PAC-104 | Schema SQL `user_api_keys` + trigger + RLS |
| PAC-105 | Componente `ApiKeyPanel.jsx` (UI gestione chiavi) |
| PAC-106 | Endpoint `api/keys/generate.js` e `api/keys/[keyId].js` |
| PAC-107 | Integrazione Dashboard + aggiornamento `vercel.json` e `package.json` |
| PAC-108 | Implementazione `api/mcp.js` (McpServer, Resources, Tools) |
| PAC-109 | Test end-to-end con Claude Desktop in staging |
| PAC-110 | Monitoraggio, alerting e documentazione operativa |

Tutti i task appartengono alla milestone **m-2: MCP Backend Layer**.
