---
id: PAC-4
title: 'Tabella proiezioni responsive: un solo scenario visibile su schermi stretti'
status: Done
assignee: []
created_date: '2026-03-10 15:20'
updated_date: '2026-03-10 15:31'
labels:
  - ui
  - frontend
  - responsive
dependencies: []
references:
  - src/components/TabellaProiezione.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Su viewport strette (mobile), la tabella delle proiezioni mostra tutte le colonne degli scenari affiancate, rendendo il layout illeggibile. Aggiungere una modalità di navigazione a scenario singolo per schermi piccoli.

### Comportamento atteso su mobile

- Viene visualizzata una sola colonna scenario per volta
- L'utente può scorrere tra gli scenari tramite frecce (← →) o swipe
- Il nome dello scenario attivo e la sua posizione (es. "2 / 3") sono visibili
- Su desktop il comportamento rimane invariato (tutte le colonne affiancate)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Su viewport < 640px la tabella mostra una sola colonna scenario per volta
- [x] #2 Sono presenti controlli di navigazione (frecce o equivalenti) per passare allo scenario precedente/successivo
- [x] #3 Il nome dello scenario corrente e l'indicatore di posizione (es. 1/3) sono visibili
- [x] #4 Su desktop (≥ 640px) la tabella continua a mostrare tutti gli scenari affiancati
- [x] #5 La colonna delle righe (ETF / anni) rimane sempre visibile come intestazione fissa a sinistra
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analisi del componente

`TabellaProiezione.jsx` (105 righe) costruisce una tabella con:
- **Colonna 1** – "Anno" (sempre visibile)
- **Colonna 2** – "Totale versato" (sempre visibile)
- **Colonne 3…N** – una per ogni scenario (queste sono il problema su mobile)

Non esiste attualmente nessun meccanismo responsive: tutte le colonne vengono renderizzate incondizionatamente.

---

## Approccio implementativo

Aggiungere uno `useState(0)` per `scenarioIdx` nel componente. Il rendering differenziato si ottiene con classi Tailwind:

- Le `<th>` e `<td>` degli scenari ricevono `hidden sm:table-cell` se **non** sono lo scenario attivo su mobile
- Lo scenario attivo riceve `table-cell` (visibile su tutte le viewport)
- Su `sm:` (≥ 640px) tutti i `hidden sm:table-cell` tornano visibili → comportamento desktop invariato

### Controlli di navigazione (solo mobile)

Aggiungere sopra la tabella un blocco `sm:hidden` con:
- Pulsante `←` (disabilitato se `scenarioIdx === 0`)
- Label: nome scenario + indicatore posizione `(1 / 3)`
- Pulsante `→` (disabilitato se `scenarioIdx === scenari.length - 1`)

### Modifiche richieste

Solo `TabellaProiezione.jsx`:
1. `import { useState } from 'react'` (già presente `useMemo`, aggiungere `useState`)
2. `const [scenarioIdx, setScenarioIdx] = useState(0)`
3. Blocco navigazione mobile prima della `<div className="overflow-x-auto …">`
4. Nelle `<th>` degli scenari: aggiungere `className={… sc_index !== scenarioIdx ? 'hidden sm:table-cell' : ''}`
5. Stessa logica nelle `<td>` degli scenari dentro `riga.valoriScenari.map`
<!-- SECTION:PLAN:END -->
