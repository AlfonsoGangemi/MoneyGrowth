---
id: PAC-66
title: 'Fix: meta tags, titolo applicazione e favicon personalizzato'
status: Done
assignee: []
created_date: '2026-03-15 09:47'
updated_date: '2026-03-15 09:56'
labels:
  - fix
  - ux
  - release
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
L'index.html ha titolo `pac-dashboard` (nome tecnico), nessun meta tag e il favicon generico di Vite.

## Cosa fare

- `<title>`: cambiare in nome human-friendly (es. "PAC Dashboard")
- `<meta name="description">`: aggiungere descrizione breve (es. "Gestisci e visualizza il tuo Piano di Accumulo Capitale su ETF")
- `<meta property="og:title">`, `og:description`, `og:type`: per condivisione social/link preview
- **Favicon**: creare/sostituire con icona personalizzata (SVG o PNG 32x32/180x180)
- Rimuovere `vite.svg` da public o tenerlo ma non come favicon
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Titolo pagina leggibile nel browser tab
- [x] #2 Meta description presente
- [x] #3 Open Graph tags presenti (og:title, og:description)
- [x] #4 Favicon personalizzato (non il logo Vite)
<!-- AC:END -->
