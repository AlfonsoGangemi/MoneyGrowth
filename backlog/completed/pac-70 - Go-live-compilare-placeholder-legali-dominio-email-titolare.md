---
id: PAC-70
title: 'Go-live: compilare placeholder legali (dominio, email, titolare)'
status: Done
assignee: []
created_date: '2026-03-15 12:10'
updated_date: '2026-03-21 15:37'
labels:
  - legal
  - release
  - manual
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prima del deploy pubblico, sostituire i 4 placeholder nei file legali con i dati reali.

## File da modificare
- `public/privacy.html`
- `public/termini.html`

## Placeholder da sostituire

| Placeholder | Valore |
|---|---|
| `[NOME TITOLARE]` | nome e cognome del titolare del trattamento |
| `[EMAIL CONTATTO]` | email dedicata al prodotto (da creare) |
| `[URL SITO]` | URL del dominio registrato |
| `[DATA AGGIORNAMENTO]` | data di compilazione (es. 15 marzo 2026) |

## Note
- Dipende dalla registrazione del dominio e dalla creazione dell'email dedicata al prodotto
- Fare una ricerca globale su `[` nei due file per trovare tutti i placeholder residui
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nessun placeholder [NOME TITOLARE] nei file HTML
- [ ] #2 Nessun placeholder [EMAIL CONTATTO] nei file HTML
- [ ] #3 Nessun placeholder [URL SITO] nei file HTML
- [ ] #4 Nessun placeholder [DATA AGGIORNAMENTO] nei file HTML
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Sostituiti tutti i placeholder in privacy.html e termini.html: [NOME TITOLARE] → Alfonso Gangemi, [EMAIL CONTATTO] → privacy@etflens.app, [DATA AGGIORNAMENTO] → 21 marzo 2026. [URL SITO] era già stato compilato in PAC-83.
<!-- SECTION:FINAL_SUMMARY:END -->
