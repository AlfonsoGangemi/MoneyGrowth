---
id: PAC-14
title: 'Bug: broker management modal and broker select invisible with single broker'
status: Done
assignee: []
created_date: '2026-03-11 13:48'
updated_date: '2026-03-11 13:51'
labels:
  - bug
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/components/AcquistoForm.jsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
After PAC-11, both the broker management UI and the broker selector in the purchase form are hidden when there is only one broker (the auto-created "Default").

## Root Cause

Two separate `length > 1` guards hide the UI:

1. **`Dashboard.jsx`** — the entire broker chip section (including the "Gestisci…" button) is wrapped in `{port.broker.length > 1 && ...}`. The "Gestisci…" button is the only entry point to `GestoreBrokerModal`, so with a single broker the modal is completely inaccessible.

2. **`AcquistoForm.jsx`** — the broker `<select>` is rendered only when `brokerList.length > 1`. With a single broker the user cannot see which broker is being assigned to the purchase, nor change it.

## Fix

- **`Dashboard.jsx`**: Move the "Gestisci…" button outside (or lower its threshold to `>= 1`), so it is always visible when at least one broker exists. The chip filter row can keep `> 1` if desired (filtering makes no sense with one broker), but the management button must always be accessible.
- **`AcquistoForm.jsx`**: Show the broker `<select>` whenever `brokerList.length >= 1` (i.e., always, since every purchase requires a broker).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The 'Gestisci broker' button is visible even when there is only one broker
- [x] #2 Clicking 'Gestisci broker' with one broker opens GestoreBrokerModal correctly
- [x] #3 The broker <select> in AcquistoForm is visible whenever at least one broker exists
- [x] #4 Broker chip filter row can remain hidden with a single broker (no functional impact)
- [x] #5 No regression on multi-broker scenarios
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Fix applicato

### Dashboard.jsx (riga 327)
- Il blocco esterno ora usa `port.broker.length > 0` — visibile con qualsiasi numero di broker
- I chip filtro (Tutti + singoli broker) restano dentro un `port.broker.length > 1` annidato — il filtro ha senso solo con più broker
- Il pulsante "Gestisci broker…" è estratto fuori dal blocco filtro, sempre visibile se esiste almeno un broker

### AcquistoForm.jsx (riga 74)
- Condizione cambiata da `brokerList.length > 1` a `brokerList.length >= 1`
- Il `<select>` broker è ora sempre visibile quando almeno un broker esiste
<!-- SECTION:FINAL_SUMMARY:END -->
