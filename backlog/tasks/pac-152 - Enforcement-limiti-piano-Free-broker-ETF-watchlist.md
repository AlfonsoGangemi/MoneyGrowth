---
id: PAC-152
title: 'Enforcement limiti piano Free (broker, ETF, watchlist)'
status: To Do
assignee: []
created_date: '2026-07-31 07:29'
updated_date: '2026-08-03 14:14'
labels: []
milestone: m-5
dependencies:
  - PAC-151
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gli utenti FREE devono avere limiti reali lato backend (non solo UI) su broker/ETF/watch, per rendere sensato il modello di monetizzazione e abilitare i teaser di upgrade lato frontend. Dipende dal modello dati piani (subscription_plan).

Implementato con un trigger Postgres `enforce_plan_limit()` (BEFORE INSERT su broker/etf/watchlist) che legge i limiti da una nuova tabella `plan_limits` (configurabile senza deploy) ed esenta gli utenti PRO attivi. Il trigger scatta sia per gli insert diretti client (creazione singola in usePortafoglio.js/useWatchlist.js) sia per gli insert via adminClient service-role (api/import.js), coprendo entrambi i path con un'unica logica. Errore distinguibile lato client tramite SQLSTATE custom `PLN01`, sullo stesso pattern già usato per `23505` (unique_violation).

Corretto anche un bug preesistente: i limiti hardcoded lato client (9 ETF, 12 watch) non esentavano gli utenti PRO. Esteso l'enforcement anche al restore da backup JSON (usePortafoglio.js `importJSON`), che ora usa la stessa strategia "archivia oltre soglia" già in uso per gli ETF anche per i broker, invece di perdere silenziosamente le associazioni broker→acquisti.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il backend blocca la creazione oltre i limiti FREE: max 3 broker, 9 ETF, 6 watch
- [ ] #2 Il blocco si applica anche in fase di import massivo (es. import da broker), non solo alla creazione singola
- [ ] #3 Quando un limite è raggiunto l'API restituisce un errore/stato chiaro e distinguibile per abilitare il teaser di upgrade
- [ ] #4 I valori dei limiti sono configurabili (non hardcoded nel codice) e calibrabili senza deploy di codice
- [ ] #5 Gli utenti PRO non sono soggetti a questi limiti
<!-- AC:END -->
