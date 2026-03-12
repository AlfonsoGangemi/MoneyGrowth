---
id: PAC-12
title: 'Grafico: serie per broker unificata con toggle visibilità'
status: To Do
assignee: []
created_date: '2026-03-11 07:49'
labels:
  - feature
  - frontend
  - grafico
dependencies:
  - PAC-6
  - PAC-11
references:
  - src/components/GraficoPortafoglio.jsx
  - src/utils/calcoli.js
  - src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Unificare il grafico storico del portafoglio in un'unica vista che mostra contemporaneamente le serie di tutti i broker, con la possibilità di escluderne singolarmente. La serie di ciascun broker è continua anche nei mesi senza acquisti, grazie ai prezzi storici da `etf_prezzi_storici`.

---

### Serie nel grafico

Per ogni broker attivo viene calcolata una serie storica mensile indipendente:

```
valore_broker(mese) = Σ (quote_accumulate_etf_per_broker(mese) × prezzo_storico(etf, mese))
```

Le quote accumulate sono calcolate **solo sugli acquisti con `broker_id` corrispondente**.

In aggiunta, viene sempre mostrata la serie **"Totale"** che aggrega tutti i broker visibili:

```
valore_totale(mese) = Σ valore_broker(mese) per tutti i broker visibili
```

---

### Continuità della serie (mesi senza acquisti)

Nei mesi in cui un broker non ha acquisti, il valore non è zero: si usa comunque il prezzo storico disponibile in `etf_prezzi_storici` (o il più recente precedente, secondo la logica di PAC-6) moltiplicato per le quote già accumulate fino a quel mese.

Se non esiste ancora nessun prezzo storico per un certo mese, il punto viene omesso (comportamento identico a PAC-6).

---

### Toggle visibilità broker

- Sopra (o sotto) il grafico, mostrare un set di **chip/badge** per ogni broker, con il colore del broker e il nome
- Click su un chip → toglie/aggiunge la serie del broker dal grafico (e dalla serie "Totale")
- Il chip della serie "Totale" è sempre presente e togglabile separatamente
- Lo stato dei toggle è locale al componente (`useState`), non persistito

---

### Stile delle serie

| Serie | Stile suggerito |
|---|---|
| Totale | Linea più spessa, colore neutro (es. bianco/grigio chiaro) |
| Broker N | Linea normale, colore del broker configurato in PAC-11 |

---

### Interazione con il filtro broker della dashboard (PAC-11)

Il filtro broker globale della dashboard controlla indicatori e tabella proiezioni. Il grafico ha i propri toggle indipendenti, così l'utente può confrontare visivamente i broker senza perdere la vista aggregata negli indicatori.

---

### Fallback

Se l'utente non ha configurato nessun broker (tutti gli acquisti con `broker_id = null`), il grafico mostra un'unica serie "Portafoglio" come nel comportamento attuale.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il grafico mostra una serie separata per ogni broker con il colore configurato in PAC-11
- [ ] #2 È presente la serie 'Totale' che somma tutti i broker visibili
- [ ] #3 Ogni serie è continua anche nei mesi senza acquisti, usando i prezzi storici da `etf_prezzi_storici`
- [ ] #4 Chip/badge sopra il grafico permettono di mostrare/nascondere ogni serie broker e la serie Totale
- [ ] #5 Nascondere un broker rimuove il suo contributo anche dalla serie Totale
- [ ] #6 Se nessun broker è configurato (tutti acquisti con broker_id null), il grafico mostra un'unica serie aggregata come attualmente
- [ ] #7 I toggle broker del grafico sono indipendenti dal filtro broker globale della dashboard (PAC-11)
<!-- AC:END -->
