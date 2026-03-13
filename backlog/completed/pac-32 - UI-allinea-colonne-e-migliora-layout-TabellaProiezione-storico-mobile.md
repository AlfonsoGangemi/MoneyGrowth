---
id: PAC-32
title: UI - allinea colonne e migliora layout TabellaProiezione (storico + mobile)
status: Done
assignee: []
created_date: '2026-03-13 12:45'
updated_date: '2026-03-13 12:50'
labels:
  - UI
  - TabellaProiezione
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Miglioramenti visivi alla TabellaProiezione per coerenza tra le due sezioni e leggibilità mobile.

## Modifiche richieste

1. **Larghezza colonne coerente**: "Anno" e "Totale versato" devono avere la stessa larghezza nella tabella Storico e nella tabella Proiezione (usare `w-*` fisso o `min-w-*` consistenti).

2. **Colonna "Rendimento" soppressa nel Storico**: unire il contenuto nella colonna "Valore reale":
   - Prima riga: importo valore (es. `€12.345`)
   - Seconda riga (sub): `+X€ (+N%)` con colore verde/rosso
   - Eliminare la colonna "Rendimento" separata → la tabella Storico passa da 4 a 3 colonne

3. **Rimuovere righe alternate**: eliminare lo zebra-striping (`bg-slate-900/40` / `bg-slate-900`) dalla tabella Proiezione; usare un colore uniforme o solo hover.

4. **Layout mobile**: verificare che entrambe le tabelle siano leggibili su schermi stretti (overflow-x-auto già presente); considerare `whitespace-nowrap` consistente e che le colonne scenario nella Proiezione abbiano la navigazione mobile funzionante.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Le colonne Anno e Totale versato hanno la stessa larghezza in entrambe le tabelle
- [x] #2 La tabella Storico ha 3 colonne: Anno | Totale versato | Valore reale (con rendimento come sub-riga)
- [x] #3 Le righe della tabella Proiezione non hanno colori alternati
- [x] #4 Entrambe le tabelle sono leggibili su mobile senza layout rotto
<!-- AC:END -->
