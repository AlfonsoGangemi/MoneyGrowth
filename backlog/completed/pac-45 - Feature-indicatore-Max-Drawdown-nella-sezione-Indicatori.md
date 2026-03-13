---
id: PAC-45
title: 'Feature: indicatore Max Drawdown nella sezione Indicatori'
status: Done
assignee: []
created_date: '2026-03-13 19:13'
updated_date: '2026-03-13 20:47'
labels:
  - feature
  - indicatori
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere il **Max Drawdown** come indicatore nella sezione Indicatori. Misura la massima perdita dal picco al minimo nella serie storica del portafoglio, rispondendo a "quanto ho perso nel momento peggiore?".

Formula:
```
maxDrawdown = min((valore[i] - max(valore[0..i])) / max(valore[0..i]))
```

Calcolabile dalla serie storica già disponibile (`serieStoricaDaPrezziStorici`). Mostrato in percentuale con colore rosso se negativo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Max Drawdown calcolato sulla serie storica reale del portafoglio aggregato
- [ ] #2 Mostrato in % con segno negativo e colore rosso
- [ ] #3 Visibile solo se esiste una serie storica con almeno 2 punti
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunta funzione `calcolaMaxDrawdown(serie)` in `calcoli.js`. Aggiunto KPI "Max Drawdown" in `Indicatori.jsx` (visibile solo se la serie ha ≥ 2 punti). Passato `prezziStorici={port.prezziStorici}` da Dashboard a Indicatori.
<!-- SECTION:FINAL_SUMMARY:END -->
