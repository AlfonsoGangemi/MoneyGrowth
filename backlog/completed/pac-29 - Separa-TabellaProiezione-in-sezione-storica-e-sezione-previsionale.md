---
id: PAC-29
title: Separa TabellaProiezione in sezione storica e sezione previsionale
status: Done
assignee: []
created_date: '2026-03-12 16:41'
updated_date: '2026-03-13 12:35'
labels: []
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Attualmente `TabellaProiezione.jsx` mostra in un'unica tabella sia le righe storiche (anni passati con dati reali) che le righe previsionali (anni futuri con scenari). L'obiettivo è separare visivamente le due sezioni in modo chiaro.

## Comportamento atteso

- **Sezione storica** (`tipo: 'reale'`): titolo "Storico", tabella o blocco dedicato con colonne Anno / Totale versato / Valore reale / Rendimento €+%
- **Sezione previsionale** (`tipo: 'proiezione'`): titolo "Proiezione", tabella dedicata con colonne Anno / Totale versato / Scenario 1 / Scenario 2 / ...
- Il navigatore scenario mobile rimane solo sulla sezione previsionale
- Se non ci sono anni storici, la sezione storica non viene renderizzata
- Se non ci sono anni previsionali, la sezione previsionale non viene renderizzata

## File coinvolti

- `pac-dashboard/src/components/TabellaProiezione.jsx` — unico file da modificare
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Le righe storiche (tipo: 'reale') sono in una sezione separata da quelle previsionali (tipo: 'proiezione')
- [x] #2 Ogni sezione ha un titolo distinto ('Storico' e 'Proiezione')
- [x] #3 Il navigatore scenario mobile è presente solo sulla sezione previsionale
- [x] #4 Se non ci sono righe storiche, la sezione storica non viene mostrata
- [x] #5 Se non ci sono righe previsionali, la sezione previsionale non viene mostrata
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
# Piano di implementazione

## Analisi dello stato attuale

`TabellaProiezione.jsx` produce un array `righe` con due tipi:
- `tipo: 'reale'` — anni passati con dati da `storicoAnnuale`
- `tipo: 'proiezione'` — anni futuri calcolati per scenario

Attualmente tutto è reso in un'unica `<table>` con logica condizionale per riga.

## Struttura target

```
<div>
  {/* Sezione storica */}
  {righeReali.length > 0 && (
    <>
      <h3>Storico</h3>
      <table>  // colonne: Anno | Totale versato | Valore reale | Rendimento
        {righeReali.map(...)}
      </table>
    </>
  )}

  {/* Sezione previsionale */}
  {righeProiezione.length > 0 && (
    <>
      <h3>Proiezione</h3>
      {/* navigatore scenario mobile — solo qui */}
      <table>  // colonne: Anno | Totale versato | Scenario1 | Scenario2 | ...
        {righeProiezione.map(...)}
      </table>
    </>
  )}
</div>
```

## Step

1. **Separare le righe** — dal array `dati.righe` derivare `righeReali` e `righeProiezione` nel render (con `filter`)

2. **Tabella storica** — colonne fisse: Anno / Totale versato / Valore reale / Rendimento (€ e %). Nessun navigatore scenario. Nessuna colonna scenario.

3. **Tabella previsionale** — colonne: Anno / Totale versato / uno per scenario. Spostare qui il navigatore scenario mobile.

4. **Condizioni di visibilità** — ogni sezione renderizzata solo se la lista corrispondente è non vuota.

5. **Intestazione titolo** — cambiare `h2` "Proiezione per anno" in titoli per sezione: `h3` "Storico" e `h3` "Proiezione". Rimuovere o spostare il titolo generico.

6. **Footer** — il paragrafo "Versamento mensile · Portafoglio attuale" rimane in fondo dopo entrambe le sezioni.

## Note

- Il `useState(scenarioIdx)` e il navigatore restano, ma vengono renderizzati solo nella sezione previsionale
- Le colonne della tabella storica NON includono gli scenari (evita `colSpan` e logica condizionale esistente)
- Nessuna modifica alla logica di calcolo in `useMemo`
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Refactoring del render in TabellaProiezione.jsx: unica tabella mista sostituita con due sezioni indipendenti. Tabella storica: colonne fisse Anno/Totale versato/Valore reale/Rendimento, nessun colSpan. Tabella previsionale: colonne Anno/Totale versato/uno per scenario, navigatore mobile spostato qui. Ogni sezione renderizzata solo se la lista corrispondente è non vuota. Logica useMemo invariata.
<!-- SECTION:FINAL_SUMMARY:END -->
