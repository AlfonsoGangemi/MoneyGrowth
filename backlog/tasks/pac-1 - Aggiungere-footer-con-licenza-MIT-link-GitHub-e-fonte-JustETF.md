---
id: PAC-1
title: 'Aggiungere footer con licenza MIT, link GitHub e fonte JustETF'
status: To Do
assignee: []
created_date: '2026-03-10 11:26'
labels:
  - ui
  - frontend
dependencies: []
references:
  - spec/function.md
  - src/components/Dashboard.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementare un footer persistente nella pagina principale (`Dashboard.jsx`) con le seguenti informazioni:

- **Licenza MIT**: testo "MIT License" con link al file `LICENSE` del repository
- **Pagina GitHub del progetto**: icona + link al repository GitHub
- **Fonte dati**: link a `https://www.justetf.com` con testo "Dati forniti da JustETF"

Il footer deve essere visivamente discreto (testo piccolo, colori neutri) e rimanere in fondo alla pagina.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il footer è visibile in fondo alla Dashboard su tutte le viewport (desktop e mobile)
- [ ] #2 È presente il link alla licenza MIT (file LICENSE del repo)
- [ ] #3 È presente il link alla pagina GitHub del progetto
- [ ] #4 È presente il link a https://www.justetf.com come fonte dei dati
- [ ] #5 Tutti i link si aprono in una nuova tab (target=_blank, rel=noopener noreferrer)
- [ ] #6 Lo stile è coerente con il design esistente (Tailwind CSS, colori neutri)
<!-- AC:END -->
