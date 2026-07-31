---
id: PAC-84
title: 'Rebrand: modifiche facoltative per completare il rebranding (infrastruttura)'
status: To Do
assignee: []
created_date: '2026-03-21 14:53'
labels:
  - rebrand
  - infrastruttura
  - opzionale
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Completamento opzionale del rebrand a livello infrastrutturale. Questi cambiamenti non sono visibili agli utenti finali ma completano la coerenza del progetto.

## Modifiche da valutare

### Package.json
- `pac-dashboard/package.json`: `"name": "pac-dashboard"` → `"name": "etflens"` o `"etf-lens"`
- Nessun impatto sulla build o sul funzionamento

### Cartella di lavoro
- Rinominare `pac-dashboard/` → `etflens/` o `etf-lens/`
- **Attenzione**: richiede aggiornamento di tutti i path nei task backlog, script, e configurazioni che referenziano la cartella
- **Rischio basso ma effort non trascurabile** — da fare in un momento di calma

### Vercel
- Rinominare il progetto Vercel da `pac-dashboard` a `etflens` (solo estetico, non cambia il deploy)
- Configurare dominio custom `etflens.app` → questa è necessaria per il go-live, ma la configurazione Vercel è separata dalla modifica del nome progetto

### Supabase
- Rinominare il progetto Supabase (solo nome display, non cambia endpoint né credenziali)

### Sentry
- Rinominare il progetto Sentry (solo display name)

### CLAUDE.md
- Aggiornare il titolo e la descrizione del progetto per riflettere il nuovo brand e posizionamento ("gestione ETF multi-broker" invece di "Piano di Accumulo Capitale")

## Note
- Nessuna di queste modifiche impatta gli utenti finali
- La configurazione del dominio custom `etflens.app` su Vercel è operativa (DNS + SSL) e conviene farla contestualmente al go-live (vedi task pac-70)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 package.json aggiornato con nuovo name
- [ ] #2 CLAUDE.md aggiornato con nuovo brand e posizionamento
- [ ] #3 Cartella rinominata (opzionale, solo se si decide di farlo)
- [ ] #4 Progetti Vercel/Supabase/Sentry rinominati nel pannello di controllo (opzionale)
<!-- AC:END -->
