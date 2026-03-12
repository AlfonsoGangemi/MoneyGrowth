---
id: PAC-25
title: 'Broker: rinomina e cambio colore inline'
status: Done
assignee: []
created_date: '2026-03-12 10:39'
updated_date: '2026-03-12 10:51'
labels:
  - feature
  - frontend
  - broker
dependencies: []
references:
  - src/components/Dashboard.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nel modale "Gestione broker" aggiungere la possibilità di rinominare un broker e cambiarne il colore direttamente inline, senza aprire un ulteriore modale.

### Comportamento attuale
Il modale mostra per ogni broker: pallino colore, nome, pulsanti "Archivia" e "Elimina". Non è possibile modificare nome o colore.

### Comportamento atteso
- Click sul nome del broker → diventa un campo di testo editabile inline
- Accanto al pallino colore → input `type="color"` cliccabile per cambiare il colore
- Salvataggio: al blur o pressione di Invio sul campo nome; immediato per il colore
- Annulla: pressione Escape ripristina il valore precedente
- La funzione `aggiornaBroker` in `usePortafoglio.js` è già predisposta per ricevere `{ nome }` e `{ colore }`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Click sul nome di un broker lo rende editabile inline
- [x] #2 Il colore è modificabile tramite un input type=color accanto al pallino
- [x] #3 Salvataggio del nome avviene al blur o pressione Invio
- [x] #4 Pressione Escape annulla la modifica del nome
- [x] #5 Il colore si aggiorna immediatamente al cambio
<!-- AC:END -->
