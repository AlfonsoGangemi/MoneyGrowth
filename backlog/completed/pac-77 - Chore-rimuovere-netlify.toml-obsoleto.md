---
id: PAC-77
title: Chore - rimuovere netlify.toml obsoleto
status: Done
assignee: []
created_date: '2026-03-19 08:18'
updated_date: '2026-03-19 12:28'
labels:
  - chore
  - cleanup
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`netlify.toml` nella root contiene redirect per il proxy JustETF ma il progetto è deployato su Vercel, non Netlify. Il file è obsoleto e crea confusione sulla configurazione di deploy.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 netlify.toml è rimosso dal repository
- [x] #2 Verificato che vercel.json copre tutte le funzionalità equivalenti
<!-- AC:END -->
