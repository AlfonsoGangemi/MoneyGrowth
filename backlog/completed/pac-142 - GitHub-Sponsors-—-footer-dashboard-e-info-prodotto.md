---
id: PAC-142
title: GitHub Sponsors — footer dashboard e info prodotto
status: Done
assignee: []
created_date: '2026-05-07 19:41'
updated_date: '2026-05-08 10:49'
labels:
  - ui
  - ux
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Portare il link **GitHub Sponsors** (già presente sulla landing page nella sezione pricing) anche dentro la dashboard, in due punti:

## Footer dashboard
- Aggiungere un link/bottone "GitHub Sponsors" nel footer della dashboard, con la stessa icona `GithubIcon` usata sulla landing page

## Info prodotto / About
- Nella sezione info prodotto (modale o pannello "About"), aggiungere il link GitHub Sponsors

## Riferimenti landing page
- URL: `https://github.com/sponsors/AlfonsoGangemi`
- Icona: `GithubIcon` (SVG inline già in `LandingPage.jsx`)
- Stile di riferimento: `LandingPage.jsx` riga ~862 (sezione pricing/donate)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Footer dashboard: link "GitHub Sponsors" visibile con GithubIcon, si apre in nuova tab su https://github.com/sponsors/AlfonsoGangemi
- [x] #2 Info prodotto/About: link "GitHub Sponsors" presente con GithubIcon, stesso URL
- [x] #3 Stile coerente con il resto della dashboard (non copiare lo stile della landing page)
<!-- AC:END -->
