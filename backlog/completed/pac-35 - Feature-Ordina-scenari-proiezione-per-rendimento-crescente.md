---
id: PAC-35
title: Feature - Ordina scenari proiezione per rendimento crescente
status: Done
assignee: []
created_date: '2026-03-13 16:31'
updated_date: '2026-03-15 11:48'
labels:
  - feature
  - dashboard
  - proiezione
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gli scenari nella sezione proiezione (`TabellaProiezione.jsx`) devono essere visualizzati sempre in ordine crescente di rendimento annuo (dal più basso al più alto), indipendentemente dall'ordine in cui sono stati creati dall'utente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 I chip scenari nell'intestazione di TabellaProiezione sono visualizzati in ordine crescente di rendimentoAnnuo
- [ ] #2 Le colonne della tabella proiezione rispettano lo stesso ordine crescente di rendimentoAnnuo
- [ ] #3 L'ordinamento è applicato solo alla visualizzazione, senza modificare l'array originale in usePortafoglio
- [ ] #4 Aggiungere un nuovo scenario lo inserisce nella posizione corretta dell'ordine, senza riordinamento manuale da parte dell'utente
- [ ] #5 La rimozione di uno scenario richiede una conferma esplicita da parte dell'utente prima di procedere (es. confirm dialog o doppio click)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Già implementato: `scenariOrdinati` in `TabellaProiezione.jsx` (riga 101) ordina via `useMemo` per `rendimentoAnnuo` crescente. La conferma eliminazione è gestita dallo stato `conferma` in `ScenarioTh`. Il DB carica già gli scenari ordinati per `rendimento_annuo`.
<!-- SECTION:FINAL_SUMMARY:END -->
