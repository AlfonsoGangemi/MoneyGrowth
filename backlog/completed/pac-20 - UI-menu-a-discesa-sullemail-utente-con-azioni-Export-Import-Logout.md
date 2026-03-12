---
id: PAC-20
title: 'UI: menu a discesa sull''email utente con azioni Export, Import, Logout'
status: Done
assignee: []
created_date: '2026-03-11 23:27'
updated_date: '2026-03-12 11:26'
labels:
  - frontend
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Compattare la barra superiore della dashboard sostituendo i pulsanti separati di Export, Import e Logout con un menu a discesa accessibile cliccando sull'email dell'utente.

**Comportamento atteso**:
- L'email dell'utente nella topbar diventa un elemento cliccabile (es. `button` o `div` con cursor-pointer)
- Al click si apre un dropdown con tre voci:
  1. **Esporta dati** — attiva la stessa logica dell'attuale pulsante Export
  2. **Importa dati** — attiva la stessa logica dell'attuale pulsante Import
  3. **Logout** — attiva la stessa logica dell'attuale pulsante Logout
- Il dropdown si chiude cliccando fuori (click-outside handler)
- I precedenti pulsanti standalone (Export, Import, Logout) vengono rimossi dalla UI

**Implementazione suggerita**:
- Stato locale `aperto` (boolean) nel componente/sezione topbar
- `useEffect` con listener `mousedown` su `document` per chiudere al click fuori
- Il dropdown è posizionato con `absolute` + `right-0` sotto l'email
- Styling coerente con il resto della dashboard (Tailwind CSS)

**File coinvolti**:
- `pac-dashboard/src/components/Dashboard.jsx` — topbar con email e pulsanti attuali
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 L'email utente nella topbar è cliccabile e mostra un dropdown
- [x] #2 Il dropdown contiene le voci: Esporta dati, Importa dati, Logout
- [x] #3 Ogni voce esegue la stessa azione del precedente pulsante corrispondente
- [x] #4 Il dropdown si chiude cliccando fuori da esso
- [x] #5 I pulsanti standalone Export, Import e Logout sono rimossi dalla topbar
- [x] #6 Il layout della topbar rimane ordinato e responsivo
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
In Dashboard.jsx: aggiunto `useEffect`/`useRef` agli import; stato `dropdownAperto` + ref `dropdownRef` + `useEffect` click-outside. Navbar refactored: rimossi i tre bottoni standalone, email diventa un `button` che apre un dropdown `absolute` con le voci "Esporta dati", "Importa dati" (label con input file hidden) e "Logout" (separato da bordo, colore rosso). Dropdown si chiude al click fuori e dopo ogni azione.
<!-- SECTION:FINAL_SUMMARY:END -->
