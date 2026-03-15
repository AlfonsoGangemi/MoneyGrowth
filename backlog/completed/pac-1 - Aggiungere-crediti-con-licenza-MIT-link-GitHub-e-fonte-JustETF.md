---
id: PAC-1
title: 'Aggiungere crediti con licenza MIT, link GitHub e fonte JustETF'
status: Done
assignee: []
created_date: '2026-03-10 11:26'
updated_date: '2026-03-15 12:02'
labels:
  - ui
  - frontend
milestone: m-0
dependencies: []
references:
  - spec/function.md
  - src/components/Dashboard.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementare una modale "Crediti" accessibile dal menu dropdown utente in `Dashboard.jsx` con le seguenti informazioni:

- **Licenza MIT**: testo "MIT License" con link al file `LICENSE` del repository
- **Pagina GitHub del progetto**: icona + link al repository GitHub
- **Fonte dati**: link a `https://www.justetf.com` con testo "JustETF"

La modale è accessibile tramite il dropdown utente (voce "Crediti"), in alternativa al footer persistente originariamente previsto.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il footer è visibile in fondo alla Dashboard su tutte le viewport (desktop e mobile)
- [x] #2 È presente il link alla licenza MIT (file LICENSE del repo)
- [x] #3 È presente il link alla pagina GitHub del progetto
- [x] #4 È presente il link a https://www.justetf.com come fonte dei dati
- [x] #5 Tutti i link si aprono in una nuova tab (target=_blank, rel=noopener noreferrer)
- [x] #6 Lo stile è coerente con il design esistente (Tailwind CSS, colori neutri)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementata modale `CreditsModal` in `Dashboard.jsx` con tre sezioni: GitHub (icona SVG + link repo), Licenza MIT (link a `/blob/main/LICENSE`), Dati di mercato (link a justetf.com). La voce "Crediti" è accessibile dal dropdown utente. Tutti i link si aprono in nuova tab con `rel="noopener noreferrer"`. Stile coerente con il design Tailwind esistente. Su richiesta dell'utente si è optato per la modale invece del footer persistente.
<!-- SECTION:FINAL_SUMMARY:END -->
