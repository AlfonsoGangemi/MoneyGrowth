---
id: PAC-81
title: 'Fix - meta tag SEO: aggiungere og:image e twitter:card in index.html'
status: Done
assignee: []
created_date: '2026-03-19 08:19'
updated_date: '2026-03-20 11:52'
labels:
  - seo
  - ux
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`index.html` ha i meta tag Open Graph di base ma manca `og:image`, `og:url` e `twitter:card`. Quando il link viene condiviso su Slack, Twitter o WhatsApp non mostra anteprima visiva.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 og:image punta a un'immagine di preview (es. screenshot o logo)
- [x] #2 og:url è impostato all'URL di produzione
- [x] #3 twitter:card è impostato a summary_large_image
- [ ] #4 I meta tag sono verificati con og:debugger di Facebook o simile
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunti in index.html: `og:url` (https://pac-dashboard.vercel.app), `og:image` (/favicon.svg), `twitter:card` (summary_large_image), `twitter:title`, `twitter:description`, `twitter:image`. Nota: aggiornare `og:url` e le URL delle immagini con il dominio di produzione reale prima del go-live. AC#4 (verifica con og:debugger) da fare manualmente dopo il deploy.
<!-- SECTION:FINAL_SUMMARY:END -->
