---
id: PAC-33
title: 'Feature - limita scenari a max 3: nascondi CTA e tronca import'
status: Done
assignee: []
created_date: '2026-03-13 13:59'
updated_date: '2026-03-13 14:03'
labels:
  - Feature
  - Scenari
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Limitare il numero di scenari di proiezione a un massimo di 3.

## Modifiche richieste

1. **Nascondi CTA aggiunta scenario**: quando gli scenari attivi sono già 3, nascondere (o disabilitare) il bottone/link per aggiungere un nuovo scenario.

2. **Import JSON**: al caricamento di un file di export, caricare solo i primi 3 scenari presenti nell'array `scenari` importato; quelli in eccesso vengono ignorati silenziosamente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Se scenari.length >= 3, la CTA per aggiungere uno scenario è nascosta o disabilitata
- [x] #2 All'import, vengono caricati al massimo i primi 3 scenari dell'array importato
<!-- AC:END -->
