---
id: PAC-26
title: 'Grafico: reset vista su ''aggregato'' se ETF selezionato viene archiviato'
status: Done
assignee: []
created_date: '2026-03-12 11:05'
updated_date: '2026-03-12 11:07'
labels:
  - bug
  - grafico
dependencies:
  - PAC-16
references:
  - pac-dashboard/src/components/GraficoPortafoglio.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

In `GraficoPortafoglio`, lo stato `vista` può contenere l'id di un ETF. Se quell'ETF viene archiviato durante la sessione (da un'altra azione nella dashboard), il bottone corrispondente scompare dal selettore (perché il selettore usa `etfAttivi`), ma `vista` mantiene il vecchio id. Il risultato è un grafico vuoto senza feedback per l'utente.

## Comportamento atteso

Se `vista` punta a un ETF che non è più presente in `etfAttivi`, resettarla automaticamente a `'aggregato'`.

## Soluzione attesa

Aggiungere un `useEffect` in `GraficoPortafoglio` che osserva `etfAttivi`: se `vista !== 'aggregato'` e nessun ETF in `etfAttivi` ha `id === vista`, chiamare `setVista('aggregato')`.

```jsx
useEffect(() => {
  if (vista !== 'aggregato' && !etfAttivi.some(e => e.id === vista)) {
    setVista('aggregato')
  }
}, [etfAttivi, vista])
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Archiviando un ETF mentre la sua vista è selezionata nel grafico, la vista torna automaticamente su 'Aggregato'
- [x] #2 Nessun regressione sulle viste singolo ETF attivi
<!-- AC:END -->
