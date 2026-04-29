---
id: PAC-124
title: >-
  TrustStats con dati reali: endpoint pubblico aggregato + visibilità
  condizionale
status: Done
assignee: []
created_date: '2026-04-28 07:24'
updated_date: '2026-04-29 09:22'
labels:
  - landing
  - backend
  - ux
dependencies: []
references:
  - pac-dashboard/src/components/LandingPage.jsx
  - pac-dashboard/api/mcp.js
  - pac-dashboard/vercel.json
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contesto

La sezione `TrustStats` nella landing page mostra attualmente 4 statistiche con valori statici hardcoded nelle chiavi i18n. L'obiettivo è sostituirli con dati reali, esposti da un endpoint pubblico aggregato, e nascondere gli indicatori (o l'intera sezione) se i valori non raggiungono soglie minime significative.

---

## Statistiche da esporre

| Indicatore | Fonte |
|---|---|
| Numero acquisti totali | `COUNT(*)` su tabella `acquisti` |
| Numero utenti registrati | `COUNT(*)` su tabella `auth.users` (via RPC) |
| Stelle GitHub | GitHub API pubblica (`/repos/alfonsogangemi/moneygrowth`) |
| Totale portafogli (ETF attivi) | `COUNT(DISTINCT etf.user_id)` o `COUNT(*)` su `etf` non archiviati |
| Totale capitale gestito (€) | `SUM(acquisti.importoInvestito)` su tutta la tabella `acquisti` |

---

## Endpoint pubblico

`GET /api/stats` — nessuna autenticazione richiesta.

Risposta:
```json
{
  "acquisti": 1240,
  "utenti": 87,
  "stelle_github": 14,
  "portafogli": 62,
  "capitale_gestito": 3450000
}
```

`capitale_gestito` è espresso in euro (intero, nessun decimale).

- Cache HTTP: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
- I valori mancanti o in errore vengono omessi dalla risposta (graceful degradation per singola fonte)
- La chiamata alle GitHub API usa `GITHUB_TOKEN` env var se disponibile (evita rate limit anonimo 60 req/h)

---

## Soglie di visibilità (da definire — valori indicativi)

| Indicatore | Soglia minima per mostrarlo |
|---|---|
| acquisti | ≥ 100 |
| utenti | ≥ 50 |
| stelle_github | ≥ 10 |
| portafogli | ≥ 30 |
| capitale_gestito | ≥ 100 000 € |

Se **tutti** gli indicatori visibili sono sotto soglia → nasconde l'intera sezione `TrustStats`.
Se **almeno uno** supera la soglia → mostra solo quelli che la superano (gli altri slot vengono omessi dal grid).

Le soglie vanno definite come costanti nel componente o in un file di config, non hardcoded inline.

---

## Formato di visualizzazione

I valori vengono arrotondati **per difetto** alla prima cifra significativa e suffissati con `+`, per comunicare "almeno questo ordine di grandezza" senza esporre il dato preciso.

### Regola generale

```
floor al multiplo dell'ordine di grandezza immediatamente inferiore + "+"
```

### Esempi

| Valore raw | Visualizzato |
|---|---|
| 7 | `7+` |
| 24 | `20+` |
| 87 | `80+` |
| 123 | `100+` |
| 1 240 | `1K+` |
| 3 700 | `3K+` |
| 12 500 | `10K+` |
| 123 456 | `100K+` |
| 3 450 000 | `3M+` |

Per `capitale_gestito` il prefisso `€` precede il valore: `€3M+`, `€100K+`.

### Algoritmo suggerito

```js
function formatStatValue(n) {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`
  if (n >= 10_000)    return `${Math.floor(n / 10_000) * 10}K+`  // es. 123456 → 120K+
  if (n >= 1_000)     return `${Math.floor(n / 1_000)}K+`         // es. 1240 → 1K+
  const mag = Math.pow(10, Math.floor(Math.log10(n)))
  return `${Math.floor(n / mag) * mag}+`                          // es. 24 → 20+, 87 → 80+
}
```

La funzione vive in un utility module dedicato (es. `src/utils/formatStat.js`) e deve avere unit test coperti.

---

## Implementazione frontend

- `useTrustStats()` hook: fetcha `/api/stats` al mount, gestisce loading/error silenzioso
- `TrustStats` riceve i dati dall'hook; filtra gli indicatori sotto soglia
- Se nessun indicatore supera la soglia → `return null`
- Durante il caricamento → nasconde la sezione (nessun skeleton, evita layout shift)
- Ogni valore è passato a `formatStatValue(n)` prima di essere renderizzato; `capitale_gestito` aggiunge prefisso `€`

---

## Note tecniche

- L'endpoint `/api/stats` non deve esporre PII; solo conteggi e aggregati numerici anonimi
- `capitale_gestito` è la somma degli importi investiti (costo storico), non il valore corrente di mercato — va etichettato di conseguenza nella UI (es. "investito sulla piattaforma")
- Query Supabase via `adminClient` (service key) — le tabelle `acquisti` e `etf` non hanno RLS pubblica
- Aggiungere `GITHUB_TOKEN` alle env var Vercel (opzionale ma consigliato)
- Aggiungere il rewrite in `vercel.json` se necessario (verificare se `/api/stats` viene già servito come serverless function)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/stats restituisce JSON con i campi disponibili, senza autenticazione
- [x] #2 I campi non disponibili (errore DB o GitHub) sono omessi gracefully senza far fallire l'endpoint
- [x] #3 La risposta ha Cache-Control: public, max-age=3600, stale-while-revalidate=86400
- [x] #4 TrustStats mostra solo gli indicatori che superano la soglia minima
- [x] #5 Se nessun indicatore supera la soglia, l'intera sezione è nascosta (return null)
- [x] #6 Le soglie sono definite come costanti, non hardcoded inline
- [x] #7 Nessun dato PII esposto dall'endpoint pubblico
- [x] #8 docs/architecture.md aggiornato con il nuovo file api/stats.js
- [x] #9 GET /api/stats include il campo capitale_gestito (SUM di acquisti.importoInvestito, intero in €)
- [x] #10 capitale_gestito è etichettato nella UI come capitale investito (costo storico), non valore di mercato
- [x] #11 Il formatter del frontend gestisce M/k/€ per capitale_gestito senza decimali
- [x] #12 I valori sono visualizzati arrotondati per difetto all'ordine di grandezza con suffisso + (es. 24→"20+", 123456→"120K+", 3450000→"3M+")
- [x] #13 capitale_gestito ha prefisso € prima del valore formattato (es. "€3M+")
- [x] #14 formatStatValue vive in src/utils/formatStat.js con unit test dedicati
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione completata

### File creati
- `pac-dashboard/api/stats.js` — endpoint `GET /api/stats` pubblico (no auth). Interroga Supabase adminClient per acquisti count, utenti count (auth.admin.listUsers), portafogli attivi (etf non archiviati), SUM importoInvestito (capitale_gestito). Fetcha stelle GitHub con GITHUB_TOKEN opzionale. Graceful degradation per singola fonte tramite Promise.allSettled. Cache-Control: public, max-age=3600, stale-while-revalidate=86400.
- `pac-dashboard/src/utils/formatStat.js` — `formatStatValue(n)`: formatta in M+/K+/N+ per difetto all'ordine di grandezza inferiore.
- `pac-dashboard/src/utils/formatStat.test.js` — 13 unit test, tutti verdi.
- `pac-dashboard/src/hooks/useTrustStats.js` — hook che fetcha `/api/stats` al mount, restituisce null finché non disponibile (no layout shift, no skeleton).

### File modificati
- `LandingPage.jsx` — TrustStats riscritto: `TRUST_THRESHOLDS` e `STATS_CONFIG` come costanti, filtra indicatori sotto soglia, return null se tutti sotto soglia, layout flex per numero variabile di indicatori. `capitale_gestito` con prefisso €.
- `src/i18n/it.js` e `en.js` — aggiunte chiavi: `lp_trust_capitale_label`, `lp_trust_acquisti_label`, `lp_trust_portafogli_label`, `lp_trust_stelle_label`.
- `docs/architecture.md` — aggiunta entry per `api/stats.js`, `formatStat.js`, `useTrustStats.js`.
<!-- SECTION:FINAL_SUMMARY:END -->
