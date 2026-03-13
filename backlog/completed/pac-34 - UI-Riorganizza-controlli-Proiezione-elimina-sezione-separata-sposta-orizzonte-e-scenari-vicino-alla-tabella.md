---
id: PAC-34
title: >-
  UI - Riorganizza controlli Proiezione: elimina sezione separata, sposta
  orizzonte e scenari vicino alla tabella
status: Done
assignee: []
created_date: '2026-03-13 16:19'
updated_date: '2026-03-13 19:23'
labels:
  - ui
  - refactor
  - dashboard
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contesto

Nella `Dashboard.jsx` esiste attualmente una sezione dedicata "Selettore Proiezione" (righe 633–690) che contiene:
1. Un toggle "Mostra proiezione" con input orizzonte (anni)
2. Una sezione "Scenari proiezione" con chip scenari e pulsante "+ Scenario"

Questi controlli devono essere rimossi dalla loro posizione attuale. Il toggle "Mostra proiezione" va **eliminato completamente**. L'input orizzonte e i controlli scenari devono essere integrati direttamente nell'intestazione della tabella `TabellaProiezione`, rendendo l'interfaccia più compatta e contestuale. La tabella proiezione sarà sempre visibile (quando ci sono ETF attivi e scenari), senza più un toggle on/off.

## Struttura attuale (Dashboard.jsx)

```
[Selettore Proiezione]         ← righe 633-663 (toggle + orizzonte)
[Scenari proiezione]           ← righe 665-690 (chip + "+ Scenario")
[TabellaProiezione]            ← righe 692-700
```

## Struttura desiderata

```
[TabellaProiezione]
  └── intestazione con: titolo | orizzonte (anni) | scenari chip | "+ Scenario"
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il blocco 'Selettore Proiezione' (righe 633–663 di Dashboard.jsx) è eliminato interamente, incluso il toggle 'Mostra proiezione'
- [ ] #2 Il blocco 'Scenari proiezione' (righe 665–690 di Dashboard.jsx) è eliminato dalla sua posizione attuale
- [ ] #3 Lo stato mostraProiezione e il relativo setter sono rimossi (o ignorati) — la tabella è sempre visibile se ci sono ETF attivi e scenari
- [ ] #4 L'input 'Orizzonte' (anni) appare nell'intestazione della TabellaProiezione, accanto al titolo della sezione
- [ ] #5 I chip scenari e il pulsante '+ Scenario' appaiono nell'intestazione della TabellaProiezione, accanto/sotto al titolo
- [ ] #6 La funzionalità di aggiunta, modifica e rimozione scenari resta invariata
- [ ] #7 La funzionalità di modifica orizzonte anni resta invariata
- [ ] #8 La tabella proiezione si mostra quando ci sono ETF attivi e almeno uno scenario, altrimenti è nascosta
- [ ] #9 Il layout è responsive e non causa overflow su schermi piccoli
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Il blocco "Selettore Proiezione" e "Scenari proiezione" sono stati rimossi da Dashboard.jsx. Il toggle `mostraProiezione` è stato eliminato. L'input orizzonte, i chip scenari e il pulsante "+ Scenario" sono stati integrati direttamente nell'intestazione di TabellaProiezione (implementato insieme a PAC-35/PAC-36). La tabella è sempre visibile quando ci sono ETF attivi e scenari.
<!-- SECTION:FINAL_SUMMARY:END -->
