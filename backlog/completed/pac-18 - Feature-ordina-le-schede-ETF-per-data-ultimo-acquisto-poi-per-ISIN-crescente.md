---
id: PAC-18
title: 'Feature: ordina le schede ETF per data ultimo acquisto, poi per ISIN crescente'
status: Done
assignee: []
created_date: '2026-03-11 23:21'
updated_date: '2026-03-12 11:23'
labels:
  - ux
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le schede ETF nella dashboard devono essere visualizzate in un ordine determinista e significativo per l'utente.

**Ordinamento richiesto** (in cascata):
1. **Data ultimo acquisto** — decrescente (ETF con acquisto più recente in cima)
2. **ISIN** — crescente come criterio di pareggio

**Dove applicare l'ordinamento**: nel derivato `etfFiltrate` o `etfAttivi` in `Dashboard.jsx`, prima del render delle card.

**Logica**:
- "Data ultimo acquisto" = `max(acquisto.data)` tra tutti gli acquisti dell'ETF; se l'ETF non ha acquisti, va in fondo (data = `''` o `'0000-00-00'`)
- Il confronto ISIN è case-insensitive (o comunque consistente)

**File coinvolti**:
- `pac-dashboard/src/components/Dashboard.jsx` — aggiungere la funzione di sort su `etfFiltrate`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Le schede ETF attive sono ordinate per data di ultimo acquisto decrescente
- [x] #2 A parità di data di ultimo acquisto, le schede sono ordinate per ISIN crescente
- [x] #3 ETF senza acquisti appaiono in fondo, ordinati per ISIN
- [x] #4 Il sort non altera la logica di filtro per broker esistente
- [x] #5 L'ordinamento si applica sia alla lista attivi che archiviati (sezione separata)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto helper `ultimaDataAcquisto` in Dashboard.jsx e applicato `.sort()` su `etfFiltrate`: ordinamento per data ultimo acquisto decrescente, poi ISIN crescente come criterio di pareggio. ETF senza acquisti vanno in fondo (stringa vuota). Il sort si applica prima di derivare `etfAttivi` ed `etfArchiviati`, quindi copre entrambe le sezioni.
<!-- SECTION:FINAL_SUMMARY:END -->
