---
id: PAC-80
title: 'Fix - accessibilità: focus trap nelle modali e keyboard navigation'
status: Done
assignee: []
created_date: '2026-03-19 08:19'
updated_date: '2026-03-20 11:52'
labels:
  - a11y
  - ux
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le modali in `Dashboard.jsx` e `AcquistoForm.jsx` non implementano focus trap (il focus può uscire dalla modale con Tab) e mancano di `role=\"dialog\"` e `aria-labelledby`. I dropdown non supportano navigazione con frecce.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Modali hanno role=dialog e aria-labelledby che punta al titolo
- [x] #2 Tab key non esce dalla modale aperta
- [x] #3 Esc chiude la modale
- [x] #4 Dropdown navigabile con frecce ↑↓
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto `useId` e `useEffect` al componente `Modal` in Dashboard.jsx: focus trap (Tab/Shift+Tab ciclano tra gli elementi focusable), Esc chiude la modale, focus automatico sul primo elemento all'apertura. Aggiunti `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sul container e `id` sull'`h2`. Per il dropdown utente: aggiunto `role="menu"` sul pannello, `role="menuitem"` su ogni voce, `useEffect` che gestisce ArrowUp/ArrowDown per navigazione e Esc per chiusura, con focus automatico sul primo item all'apertura.
<!-- SECTION:FINAL_SUMMARY:END -->
