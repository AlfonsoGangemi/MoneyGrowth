# Deploy su Vercel

## Build

```bash
npm run build
```

Lo script incatena quattro fasi, **tutte necessarie**:

```
vite build                              # bundle client → dist/
vite build --ssr src/entry-server.jsx   # bundle SSR → dist-server/
node scripts/prerender.mjs              # genera HTML statico per le rotte pubbliche
node scripts/check-secrets.mjs --bundle # verifica che nessun segreto finisca nel bundle
```

### ⚠️ Il Build Command deve restare `npm run build`

`vercel.json` dichiara esplicitamente:

```json
"buildCommand": "npm run build",
"outputDirectory": "dist",
```

Questi valori **hanno precedenza sulle impostazioni del dashboard Vercel** e sono lì per un motivo preciso: un override nel dashboard (es. `vite build`) fa saltare SSR build e prerender **senza far fallire il deploy**. Il sito continua a funzionare per gli utenti, ma serve a Googlebot e Bingbot il template vuoto — nessun `<h1>`, nessun contenuto, stesso `canonical` su ogni rotta.

Il problema è già accaduto ed è rimasto invisibile a lungo (vedi task PAC-95). Diagnosi rapida:

```bash
curl -s https://etflens.app | wc -c          # atteso ~75.000, non ~6.000
curl -s https://etflens.app/privacy | wc -c  # deve differire dalla home
```

Se le rotte servono lo stesso numero di byte, il prerender non sta girando. Nei build log Vercel devono comparire le righe `Prerendered: / → https://etflens.app`.

## Prerendering e metadati SEO

`scripts/prerender.mjs` genera HTML statico usando `src/entry-server.jsx`. Oltre a iniettare il markup React in `<div id="root">`, sostituisce per ogni rotta:

- `<title>` e `<meta name="description">`
- `<link rel="canonical">`, `og:url`, `og:title`, `og:description`, `twitter:title`, `twitter:description`
- `<meta name="robots" content="noindex, follow">` sulle rotte marcate `noindex: true`
- rimuove il blocco JSON-LD `FAQPage` dalle pagine diverse dalla home (descrive solo la landing)

| Rotta | File generato | Indicizzabile |
|---|---|---|
| `/` | `dist/index.html` | sì |
| `/privacy` | `dist/privacy/index.html` | sì |
| `/termini` | `dist/termini/index.html` | sì |
| `/oauth/authorize` | `dist/oauth/authorize/index.html` | no |
| `/404` | `dist/404.html` | no |

### Aggiungere una rotta

Va fatto in **due punti**, ed è verificato dai test:

1. `src/utils/routes.js` → `KNOWN_ROUTES` (routing client in `App.jsx`)
2. `scripts/prerender.mjs` → oggetto `routes`, con `out` e metadati

Se una rotta compare solo nel primo, il build **fallisce**: senza HTML dedicato riceverebbe il markup della home e l'idratazione salterebbe. Se è indicizzabile va aggiunta anche a `public/sitemap.xml`.

⚠️ I componenti raggiungibili da una rotta prerenderizzata devono essere **SSR-safe**: nessun accesso a `window` o `document` durante il render (solo dentro `useEffect`, oppure con guardia `typeof window !== 'undefined'`). Il markup del primo render deve coincidere tra server e client, altrimenti l'idratazione fallisce.

Le sostituzioni passano da `replaceOnce()`, che fa fallire il build se un pattern non trova esattamente un match: se il template `index.html` cambia struttura, il build si rompe invece di produrre silenziosamente metadati sbagliati.

Lato client `src/main.jsx` usa `hydrateRoot` quando trova markup prerenderizzato, `createRoot` altrimenti.

## Variabili d'ambiente

Da configurare nel pannello Vercel:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## DNS e redirect

Il dominio è dietro **Cloudflare** in modalità proxy. Due conseguenze operative:

- **`www` → apex**: gestito da una *Redirect Rule* Cloudflare che risponde 301 dall'edge. Il blocco `redirects` in `vercel.json` resta come fallback ma non viene raggiunto finché Cloudflare è davanti. Se si disattivasse il proxy, `www.etflens.app` va aggiunto come dominio nel progetto Vercel, altrimenti Cloudflare non riesce a validare il certificato origin e l'hostname risponde **HTTP 526**.
- **Cache**: dopo un deploy Cloudflare può servire la versione precedente per ore. Prima di concludere che una modifica non è arrivata, fare **Purge Cache**.

L'impostazione Cloudflare *"Block AI bots"* blocca i crawler AI (GPTBot, ClaudeBot, PerplexityBot) **a monte di `robots.txt`**, che invece li autorizza esplicitamente. Può inoltre bloccare i connettori MCP remoti.

### Configurazione Cloudflare richiesta

Questa configurazione vive nella dashboard Cloudflare, **non nel repo**: se la zona viene ricostruita o il managed ruleset aggiornato, va riapplicata. Senza di essa alcune funzionalità si rompono in modo silenzioso e con errori fuorvianti.

| Configurazione | Perché è necessaria | Se manca |
|---|---|---|
| **WAF Custom rule — Skip su `/api/mcp`** | Espressione `starts_with(http.request.uri.path, "/api/mcp")`, action *Skip* sul ruleset managed che include "Block AI bots"; da posizionare **sopra** le managed rules | Le `POST /api/mcp` del gateway claude.ai (User-Agent `Claude-User`, IP Google Cloud) vengono bloccate **prima di Vercel**: nessun log lato server e il client riporta un `McpAuthorizationError` che punta erroneamente alle credenziali (PAC-127) |
| **Redirect Rule `www` → apex** | 301 dall'edge; il blocco `redirects` in `vercel.json` è solo un fallback | Vedi sopra: senza proxy o senza dominio su Vercel, `www.etflens.app` risponde HTTP 526 |

**Verifica automatica** della prima riga:

```bash
npm run check:mcp-reachable
```

Invia la stessa probe non autenticata di claude.ai (UA `Claude-User`) e verifica di ricevere il 401 applicativo con `WWW-Authenticate` invece di un blocco edge; un secondo controllo con UA neutro isola la causa. Exit code 1 se l'endpoint non è raggiungibile. Non richiede segreti.

Il controllo gira **ogni giorno alle 06:00 UTC** tramite GitHub Actions (`.github/workflows/check-mcp-reachable.yml`) — vedi [Monitoraggio automatico](#monitoraggio-automatico-github-actions).

## Rewrite e gestione 404

`vercel.json` contiene **solo** i due rewrite `.well-known` per la discovery OAuth:

```json
"rewrites": [
  { "source": "/.well-known/oauth-authorization-server", "destination": "/api/oauth/discovery?type=as" },
  { "source": "/.well-known/oauth-protected-resource",    "destination": "/api/oauth/discovery?type=pr" }
]
```

**Non deve esserci un rewrite catch-all verso `/index.html`.** Ogni path viene risolto sul filesystem: le rotte prerenderizzate hanno il proprio file, tutto il resto ricade su `dist/404.html`, che Vercel serve con status **404**. Un catch-all riporterebbe ogni URL inesistente a HTTP 200 con la landing — un soft 404 che Google penalizza e che consuma crawl budget.

Il test in `src/utils/routes.test.js` fallisce se un rewrite catch-all viene reintrodotto.

Conseguenza da tenere presente: **una rotta client-side non dichiarata in `routes.js` restituisce 404**, non la landing. È voluto — un errore di configurazione diventa visibile invece di degradare in silenzio.

---

## Monitoraggio automatico (GitHub Actions)

I workflow vivono in `.github/workflows/` e sono versionati come il resto del codice: a differenza della configurazione Cloudflare, sono revisionabili e ripristinabili dal repo.

| Workflow | Quando | Cosa fa |
|---|---|---|
| `ci.yml` | Push su `main` e ogni pull request | `npm ci` + `npm run lint` + `npm test`. Entrambi bloccanti: un lint con errori o un test rosso fanno fallire il job |
| `check-mcp-reachable.yml` | Ogni giorno alle **06:00 UTC** + esecuzione manuale (`workflow_dispatch`) | Esegue `npm run check:mcp-reachable` per verificare che la WAF Skip rule su `/api/mcp` sia ancora attiva (vedi [Configurazione Cloudflare richiesta](#configurazione-cloudflare-richiesta)) |

**`ci.yml` non ripete la build**: Vercel la esegue già a ogni push (`npm run build`, che include prerendering e `check-secrets --bundle`) e un suo fallimento blocca il deploy. Duplicarla in Actions creerebbe due pipeline che possono divergere.

Lo step di test gira anche se il lint fallisce (`if: '!cancelled()'`), così un singolo run riporta tutti i problemi invece di scoprirli uno alla volta. Il workflow usa `concurrency` con `cancel-in-progress`: su push ravvicinati sullo stesso ref resta viva solo l'ultima esecuzione.

> Il lint è bloccante perché gli errori ESLint sono stati azzerati (da 84 a 0). Restano 16 warning non bloccanti, di cui 6 `react-hooks/set-state-in-effect` tracciati in PAC-164.

Il job non richiede segreti (la probe è volutamente non autenticata) né `npm ci` (lo script usa solo il `fetch` nativo di Node), quindi resta veloce e senza dipendenze da mantenere. Ha `permissions: contents: read`, cioè nessun accesso in scrittura al repository.

**Come si viene avvisati:** se lo script esce con codice diverso da zero il job risulta fallito, GitHub invia un'email al proprietario del repo (comportamento predefinito) e il fallimento compare nel tab *Actions*. Non esiste alcun altro alert se non lo si aggiunge esplicitamente.

Tre limiti dello scheduler da conoscere:

- **Il cron non è puntuale.** I job schedulati vengono accodati e nei momenti di carico partono in ritardo, occasionalmente saltano un'esecuzione. Accettabile per un check di raggiungibilità, inadatto a compiti che richiedono precisione oraria.
- **Disattivazione per inattività.** GitHub disabilita i workflow schedulati dopo **60 giorni senza commit** sul repository, avvisando via email. Se il progetto va in pausa, il monitoraggio si spegne da solo — proprio nella finestra in cui una regressione Cloudflare passerebbe inosservata più a lungo. Alla ripresa dei lavori va riabilitato dal tab *Actions*.
- **Minuti di esecuzione.** Gratuiti e illimitati sui repository pubblici; sui privati consumano la quota mensile del piano (il job dura circa 30 secondi, ~15 minuti al mese con cadenza giornaliera).

Nota sulla scelta dello strumento: Vercel Cron avrebbe richiesto un endpoint HTTP dedicato, cioè una nuova Serverless Function — non disponibile essendo già al limite di 12 del piano Hobby (vedi `CLAUDE.md`). GitHub Actions gira fuori da Vercel e non incide su quel conteggio.
