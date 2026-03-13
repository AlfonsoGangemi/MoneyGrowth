---
id: PAC-50
title: Verifica UX stato iniziale nuovo utente registrato
status: Done
assignee: []
created_date: '2026-03-13 19:58'
updated_date: '2026-03-13 20:31'
labels:
  - ux
  - onboarding
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/Dashboard.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Verificare che al primo accesso dopo la registrazione, la dashboard mostri uno stato iniziale chiaro e funzionale, senza che l'utente debba capire da solo cosa fare.

## Comportamento atteso

1. **Broker "Default"** — deve essere presente automaticamente alla prima registrazione, senza che l'utente debba crearlo manualmente
2. **CTA primo ETF** — la dashboard deve mostrare l'empty state con il pulsante "Aggiungi il primo ETF" ben visibile
3. **Nessun dato residuo** — lo stato deve essere pulito (nessun ETF, nessun acquisto, nessuno scenario orfano)

## Note

- Verificare se il broker "Default" viene creato lato Supabase al momento della registrazione (trigger DB o logica applicativa)
- Se manca, valutare dove inserire la creazione automatica: trigger `on_user_created` in Supabase oppure nel hook `usePortafoglio` al primo caricamento
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Al primo accesso dopo la registrazione è presente almeno il broker "Default"
- [x] #2 La dashboard mostra l'empty state con la CTA "Aggiungi il primo ETF" visibile e funzionante
- [x] #3 Non sono presenti dati residui o errori visibili al primo caricamento
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verifica completata: il comportamento atteso era già implementato correttamente.\n\n- **AC #1** — `usePortafoglio.js` righe 156–166: se al caricamento non esistono broker, ne crea uno "Default" (`colore: '#6366f1'`) via `supabase.insert` e lo aggiunge allo stato.\n- **AC #2** — `Dashboard.jsx`: condizione `etfAttivi.length === 0 && etfArchiviati.length === 0` mostra l'empty state con emoji 📈, testo e bottone "Aggiungi il primo ETF".\n- **AC #3** — Lo stato iniziale è `defaultState` (tutti array vuoti). Nessun dato residuo possibile.\n\nNessuna modifica al codice necessaria.
<!-- SECTION:FINAL_SUMMARY:END -->
