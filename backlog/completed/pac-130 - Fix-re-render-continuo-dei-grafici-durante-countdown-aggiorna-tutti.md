---
id: PAC-130
title: Fix re-render continuo dei grafici durante countdown "aggiorna tutti"
status: Done
assignee: []
created_date: '2026-04-30 15:39'
labels:
  - fix
  - performance
  - react
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

Dopo aver cliccato "Aggiorna tutti" nella sezione ETF, il countdown da 60 secondi causava 60 re-render completi di `Dashboard`, inclusi tutti i componenti grafici Recharts (`GraficoPortafoglio`, `Indicatori`, `TabellaProiezione`). I grafici di distribuzione venivano ridisegnati ogni secondo per tutta la durata del countdown.

**Causa radice:** `globalCooldownSec` e `aggStato` erano state di `Dashboard`. Ogni decremento via `setTimeout` triggherava un re-render del componente padre e di tutti i suoi figli pesanti.

## Soluzione

Estratto il componente `AggiornaPrezziButton` da `Dashboard.jsx`. Il nuovo componente possiede internamente:
- `stato` (`'idle' | 'running'`) 
- `cooldown` (number, 0–60)
- il `useEffect` del countdown
- la logica fetch verso `/api/extraetf-quotes`

Dashboard passa al componente:
- `etfConIsin` — lista ETF con ISIN
- `onApplicaPrezzi(daAggiornare, prezzi)` — callback che applica i prezzi e restituisce gli ISIN con errori
- `onErrori(errori)` — `setAggErroriIsin` per visualizzare gli errori nel Dashboard

`aggErroriIsin` rimane in Dashboard perché è visualizzato nel JSX del Dashboard (non nel button), e viene aggiornato solo una volta al termine del fetch — non ogni secondo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cliccando 'aggiorna tutti' i grafici non vengono ridisegnati durante il countdown
- [ ] #2 Il countdown appare correttamente nel button con il formato 'Aggiorna tutti (Xs)'
- [ ] #3 Il button è disabilitato durante running e durante il cooldown
- [ ] #4 Gli errori ISIN continuano ad essere visualizzati sotto la sezione ETF
- [ ] #5 Nessuna regressione sulle funzionalità di aggiornamento prezzi
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactoring completato: il componente `AggiornaPrezziButton` (privato, dentro `Dashboard.jsx`) ora possiede tutta la state volatile del countdown. Dashboard si re-renderizza solo in risposta a cambiamenti di dati reali (portafoglio, broker, filtri), non più ogni secondo durante il cooldown.
<!-- SECTION:FINAL_SUMMARY:END -->
