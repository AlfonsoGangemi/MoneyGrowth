---
id: PAC-59
title: 'Fix sicurezza: piccoli fix auth e import JSON'
status: Done
assignee: []
created_date: '2026-03-14 15:25'
updated_date: '2026-03-15 08:18'
labels:
  - security
  - fix
dependencies:
  - PAC-55
references:
  - pac-dashboard/src/components/AuthForm.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Gruppo di fix minori emersi dall'audit PAC-55:\n- `AuthForm.jsx`: il messaggio \"Email non ancora confermata\" rivela che l'email esiste nel sistema (account enumeration)\n- `usePortafoglio.js`: l'import JSON non valida la struttura del file né limita la dimensione, potenziale crash con file malformati
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il messaggio di errore per email non confermata non distingue dall'email inesistente
- [ ] #2 L'import JSON valida che etf, scenari, broker siano array prima di procedere
- [ ] #3 L'import JSON rifiuta file > 1MB con messaggio di errore chiaro
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
AuthForm: messaggio "Email not confirmed" uniformato a "Email o password errati" (prevenzione account enumeration). importJSON: validazione file > 1MB e controllo che etf/broker siano array prima di procedere.
<!-- SECTION:FINAL_SUMMARY:END -->
