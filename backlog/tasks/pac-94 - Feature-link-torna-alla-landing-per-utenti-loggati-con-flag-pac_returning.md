---
id: PAC-94
title: 'Feature: link "torna alla landing" per utenti loggati con flag pac_returning'
status: Done
assignee: []
created_date: '2026-03-25 14:19'
updated_date: '2026-03-25 14:26'
labels:
  - ui
  - auth
  - landing
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Un utente autenticato che ha già visto la landing (flag `pac_returning=1` in localStorage) viene portato direttamente alla dashboard. Aggiungere un link/pulsante che consenta di tornare alla landing page: al click, il flag `pac_returning` viene rimosso (o impostato a 0) e la pagina viene ricaricata, così l'utente vede di nuovo la landing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Un link o pulsante è visibile nell'interfaccia per gli utenti loggati con flag pac_returning=1 (es. nel menu, nel footer o nell'header)
- [x] #2 Al click, il flag pac_returning viene rimosso da localStorage
- [x] #3 Dopo la rimozione del flag, la pagina viene ricaricata e l'utente vede la landing page
- [x] #4 Il link non è visibile (o non ha effetto) per utenti non loggati
- [x] #5 Dopo il redirect alla landing, se l'utente naviga alla dashboard il flag pac_returning viene reimpostato a 1
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato il link "Torna alla home" nel dropdown utente della Dashboard.

**Modifiche:**
- `App.jsx`: aggiunto stato `mostraLanding`; quando attivo, mostra `LandingPage` anche all'utente autenticato. Il `useEffect` che imposta `pac_returning=1` viene saltato quando `mostraLanding=true`. Aggiunta funzione `handleTornaAllaLanding` (rimuove flag, attiva mostraLanding) passata come prop a Dashboard. Quando l'utente clicca CTA dalla landing, il flag viene reimpostato e la Dashboard torna visibile.
- `Dashboard.jsx`: accetta prop `onTornaAllaLanding`; aggiunta voce nel dropdown sopra Logout.
- `i18n/it.js`: aggiunta chiave `torna_alla_landing: 'Torna alla home'`.
- `i18n/en.js`: aggiunta chiave `torna_alla_landing: 'Back to home'`.

Nessun reload di pagina necessario: tutto gestito con stato React.
<!-- SECTION:FINAL_SUMMARY:END -->
