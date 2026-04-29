---
id: PAC-124
title: >-
  TrustStats con dati reali: endpoint pubblico aggregato + visibilità
  condizionale
status: To Do
assignee: []
created_date: '2026-04-28 07:24'
updated_date: '2026-04-28 07:29'
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
| Totale ETF | `COUNT(*)` su `etf` (anche archiviati) |
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

`capitale_gestito` è espresso in euro (intero, nessun decimale). Il frontend lo formatta in formato leggibile (es. `€3.4M`, `€340k`).

- Cache HTTP: `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
- I valori mancanti o in errore vengono omessi dalla risposta (graceful degradation per singola fonte)
- La chiamata alle GitHub API usa `GITHUB_TOKEN` env var se disponibile (evita rate limit anonimo 60 req/h)

---

## Soglie di visibilità (da definire — valori indicativi)

| Indicatore | Soglia minima per mostrarlo |
|---|---|
| acquisti | ≥ 200 |
| utenti | ≥ 20 |
| stelle_github | ≥ 10 |
| portafogli | ≥ 30 |
| capitale_gestito | ≥ 50 000 € |

Se **tutti** gli indicatori visibili sono sotto soglia → nasconde l'intera sezione `TrustStats`.
Se **almeno uno** supera la soglia → mostra solo quelli che la superano (gli altri slot vengono omessi dal grid).

Le soglie vanno definite come costanti nel componente o in un file di config, non hardcoded inline.

---

## Implementazione frontend

- `useTrustStats()` hook: fetcha `/api/stats` al mount, gestisce loading/error silenzioso
- `TrustStats` riceve i dati dall'hook; filtra gli indicatori sotto soglia
- Se nessun indicatore supera la soglia → `return null`
- Durante il caricamento → mostra la sezione con i valori skeleton (o nasconde, da decidere)
- Mapping indicatore → label i18n e valore formattato:
  - conteggi: `1.2k` per ≥ 1000
  - `capitale_gestito`: `€3.4M` / `€340k` / `€12k` — sempre con prefisso `€`, nessun decimale

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
- [ ] #1 GET /api/stats restituisce JSON con i campi disponibili, senza autenticazione
- [ ] #2 I campi non disponibili (errore DB o GitHub) sono omessi gracefully senza far fallire l'endpoint
- [ ] #3 La risposta ha Cache-Control: public, max-age=3600, stale-while-revalidate=86400
- [ ] #4 TrustStats mostra solo gli indicatori che superano la soglia minima
- [ ] #5 Se nessun indicatore supera la soglia, l'intera sezione è nascosta (return null)
- [ ] #6 Le soglie sono definite come costanti, non hardcoded inline
- [ ] #7 Nessun dato PII esposto dall'endpoint pubblico
- [ ] #8 docs/architecture.md aggiornato con il nuovo file api/stats.js
- [ ] #9 GET /api/stats include il campo capitale_gestito (SUM di acquisti.importoInvestito, intero in €)
- [ ] #10 capitale_gestito è etichettato nella UI come capitale investito (costo storico), non valore di mercato
- [ ] #11 Il formatter del frontend gestisce M/k/€ per capitale_gestito senza decimali
<!-- AC:END -->
