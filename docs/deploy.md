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

`scripts/prerender.mjs` genera HTML statico per `/`, `/privacy` e `/termini` usando `src/entry-server.jsx`. Oltre a iniettare il markup React in `<div id="root">`, sostituisce per ogni rotta:

- `<title>` e `<meta name="description">`
- `<link rel="canonical">`, `og:url`, `og:title`, `og:description`, `twitter:title`, `twitter:description`
- rimuove il blocco JSON-LD `FAQPage` dalle pagine diverse dalla home (descrive solo la landing)

I metadati per rotta sono definiti nell'oggetto `routes` in cima allo script: **per aggiungere una pagina pubblica indicizzabile, va aggiunta lì** e in `public/sitemap.xml`.

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

## Rewrite e soft 404 *(limite noto)*

Il rewrite catch-all in `vercel.json` serve `/index.html` per ogni path non-`/api`:

```json
{ "source": "/((?!api(?:/|$)).*)", "destination": "/index.html" }
```

I file prerenderizzati hanno la precedenza, quindi `/privacy` e `/termini` vengono serviti correttamente. Ma qualsiasi URL inesistente restituisce **HTTP 200** con la home invece di un 404: Google lo classifica come soft 404 e consuma crawl budget. Restringere il catch-all richiede prima di mappare tutte le rotte servite dalla SPA (dashboard, consenso OAuth).
