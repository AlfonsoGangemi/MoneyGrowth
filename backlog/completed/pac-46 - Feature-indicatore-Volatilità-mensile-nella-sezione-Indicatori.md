---
id: PAC-46
title: 'Feature: indicatore Volatilità mensile nella sezione Indicatori'
status: Done
assignee: []
created_date: '2026-03-13 19:13'
updated_date: '2026-03-13 20:47'
labels:
  - feature
  - indicatori
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere la **Volatilità** (deviazione standard dei rendimenti mensili) come indicatore. Risponde a "quanto oscilla il portafoglio mese per mese?".

Formula:
```
rendimenti_mensili = [(valore[i] - valore[i-1]) / valore[i-1]]
volatilità = stddev(rendimenti_mensili) * sqrt(12)  // annualizzata
```

Calcolabile dalla serie storica mensile già disponibile. Mostrata in % annualizzata.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Volatilità annualizzata calcolata sulla serie storica mensile
- [ ] #2 Mostrata in % con almeno 1 decimale
- [ ] #3 Visibile solo se esistono almeno 3 mesi di storico
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunta funzione `calcolaVolatilita(serie)` in `calcoli.js` (stddev rendimenti mensili * sqrt(12)). Aggiunto KPI "Volatilità" in `Indicatori.jsx` (visibile solo se la serie ha ≥ 3 punti).
<!-- SECTION:FINAL_SUMMARY:END -->
