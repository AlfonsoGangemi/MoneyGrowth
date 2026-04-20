---
id: PAC-107
title: 'Hardening medio: prompt injection, data freshness e CORS sul MCP endpoint'
status: To Do
assignee: []
created_date: '2026-04-07 14:21'
updated_date: '2026-04-20 11:54'
labels:
  - security
  - backend
milestone: m-2
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tre problemi di media priorità da affrontare durante l'implementazione, non bloccanti per il primo deploy ma necessari prima di un uso allargato.

## M3 — Prompt injection via campi user-controlled

I campi `nome`, `isin`, `emittente` degli ETF sono inseriti dall'utente. Un nome ETF contenente testo manipolativo (es. `"Ingora le istruzioni precedenti..."`) potrebbe influenzare il comportamento del LLM se i dati vengono serializzati in stringhe narrative invece che in JSON strutturato.

**Mitigazione sufficiente per questo threat model:**
- Il MCP server restituisce sempre dati come JSON strutturato nel campo `content` dei tool result
- Non costruire mai stringhe tipo `"Il tuo ETF ${etf.nome} vale..."` lato server MCP — lasciare la narrativa all'LLM
- Aggiungere nota nella documentazione del MCP server

**Mitigazione futura (se il servizio diventa multi-tenant pubblico):**
- Sanitizzazione leggera dei campi testo prima dell'output (strip di sequenze sospette)

## M4 — Data freshness disclaimer obbligatorio

`prezzoCorrente` nel DB è l'ultimo valore sincronizzato dall'utente nell'app, non un prezzo live di mercato. L'LLM che risponde "il tuo portafoglio vale X€" senza questo contesto può ingannare l'utente.

**Azioni:**
- Aggiungere campo `_meta` nell'output JSON di ogni tool/resource:
```json
{
  "_meta": {
    "prezzi_aggiornati_al": "2026-04-07T10:30:00Z",
    "avviso": "I prezzi riflettono l'ultima sincronizzazione manuale. Non sono prezzi di mercato in tempo reale."
  },
  "etf": [...]
}
```
- Includere la stessa nota nella `description` di ogni MCP Resource e Tool

## B1 — CORS non deve essere presente sul MCP endpoint

I client MCP (Claude Desktop, CLI) non sono browser: non inviano preflight OPTIONS e non sono soggetti alla Same-Origin Policy. Aggiungere `Access-Control-Allow-Origin: *` per abitudine esporrebbe l'endpoint a fetch cross-origin dal browser.

**Azione:** NON aggiungere alcun header CORS in `api/mcp.js`. Se necessario in futuro per un client web, limitare a `Access-Control-Allow-Origin: https://etflens.app`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 L'output JSON di get_portfolio include un campo _meta con timestamp ultimo aggiornamento e avviso prezzi non real-time
- [ ] #2 La description di ogni MCP Tool e Resource menziona esplicitamente che i prezzi non sono real-time
- [ ] #3 api/mcp.js non contiene alcun header Access-Control-Allow-Origin
- [ ] #4 I dati ETF sono restituiti come JSON strutturato, nessuna interpolazione di stringhe narrative lato server
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Tutte le azioni ricadono in `api/mcp.js` (PAC-109). Nessuna modifica al DB o al frontend.

## Step 1 — `_meta` helper (M4)

Definire una funzione `buildMeta()` riutilizzabile da tutti i tool:

```js
function buildMeta() {
  return {
    generated_at: new Date().toISOString(),
    avviso: 'I prezzi (prezzoCorrente) riflettono l\'ultima sincronizzazione manuale nell\'app. Non sono prezzi di mercato in tempo reale.',
    archiviati_inclusi: true,
  }
}
```

Ogni tool result include `_meta` come primo campo del payload:
```js
return { content: [{ type: 'text', text: JSON.stringify({ _meta: buildMeta(), etf: data }) }] }
```

## Step 2 — Disclaimer nelle description di Tool e Resource (M4)

Aggiungere la frase `"I prezzi non sono real-time — riflettono l'ultima sincronizzazione manuale."` nella `description` di ogni `server.tool(...)` e `server.resource(...)`. Esempio:

```js
server.tool('get_portafoglio', 'Ritorna il portafoglio completo. I prezzi non sono real-time.', {}, handler)
```

## Step 3 — JSON strutturato, zero interpolazione (M3)

Regola architetturale da rispettare nella scrittura di tutti i handler:
- Usare sempre `JSON.stringify(oggetto)` come `text` nel content
- Mai costruire stringhe narrative lato server (es. \`"Il tuo ETF ${nome} vale..."\`)
- La narrativa è responsabilità dell'LLM, il server espone solo dati strutturati

Non richiede codice aggiuntivo, è un vincolo di stile da verificare in code review.

## Step 4 — Nessun header CORS (B1)

Non aggiungere mai `res.setHeader('Access-Control-Allow-Origin', ...)` in `api/mcp.js`.

Verifica manuale in code review: un grep su `api/mcp.js` è sufficiente e non va automatizzato (gli altri endpoint ExtraETF usano legittimamente lo stesso header).
<!-- SECTION:PLAN:END -->
