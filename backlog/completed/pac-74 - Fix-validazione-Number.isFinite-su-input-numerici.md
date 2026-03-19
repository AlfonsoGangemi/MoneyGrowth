---
id: PAC-74
title: Fix - validazione Number.isFinite su input numerici
status: Done
assignee: []
created_date: '2026-03-19 08:18'
updated_date: '2026-03-19 08:55'
labels:
  - bug
  - validation
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nei form di inserimento (AcquistoForm, Dashboard, TabellaProiezione) i valori numerici vengono processati con `parseFloat()` ma senza controllo `Number.isFinite()`. In casi limite (importo molto grande, prezzo vicino a 0) il risultato può essere `Infinity` o `NaN` e venire salvato nel DB.

File interessati: `AcquistoForm.jsx`, `Dashboard.jsx` (~riga 348), `TabellaProiezione.jsx` (~riga 33).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tutti i parseFloat() critici sono seguiti da controllo Number.isFinite()
- [x] #2 Valori Infinity o NaN vengono rifiutati con errore UI prima del salvataggio
- [x] #3 La modifica rendimento scenario accetta anche valori negativi (≠ 0) se finiti
<!-- AC:END -->
