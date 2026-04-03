---
id: DRAFT-1
title: 'Feature: visualizzazione grafica distribuzione portafoglio (fase 2)'
status: Draft
assignee: []
created_date: '2026-03-31 15:44'
labels: []
dependencies:
  - PAC-97
references:
  - src/components/Indicatori.jsx
  - src/utils/calcoli.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Miglioramento visivo dell'indicatore di distribuzione percentuale del portafoglio (PAC-97). Dopo aver verificato la UX della versione numerica, aggiungere una rappresentazione grafica (torta, barre orizzontali, o altro formato da decidere in base alle prove).

La logica di calcolo è già in calcoli.js (PAC-97): questo task riguarda esclusivamente la parte di visualizzazione.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il formato grafico è scelto in base alle prove UX sulla versione numerica (PAC-97)
- [ ] #2 Il grafico rispetta il filtro broker e si aggiorna dinamicamente come la versione numerica
- [ ] #3 La versione numerica (lista testo) rimane disponibile o viene sostituita dal grafico, a seconda della scelta UX
<!-- AC:END -->
