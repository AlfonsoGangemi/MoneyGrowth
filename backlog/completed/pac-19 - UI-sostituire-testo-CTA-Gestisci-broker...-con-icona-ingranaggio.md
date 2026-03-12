---
id: PAC-19
title: 'UI: sostituire testo CTA "Gestisci broker..." con icona ingranaggio'
status: Done
assignee: []
created_date: '2026-03-11 23:24'
updated_date: '2026-03-12 10:51'
labels:
  - frontend
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La CTA "Gestisci broker..." in `Dashboard.jsx` occupa spazio testuale non necessario. Sostituirla con un'icona ingranaggio (⚙️ o SVG) per compattare la UI, mantenendo la stessa funzionalità (apertura modal gestione broker).

**Comportamento atteso**:
- L'icona è cliccabile e apre il modal gestione broker esattamente come prima
- Aggiungere `title="Gestisci broker"` sull'elemento per accessibilità (tooltip nativo al hover)

**File coinvolti**:
- `pac-dashboard/src/components/Dashboard.jsx` — localizzare il pulsante "Gestisci broker..." e sostituirlo

**Nota**: il progetto usa Tailwind CSS; preferire un SVG inline o un carattere Unicode (⚙) piuttosto che aggiungere una nuova dipendenza di icone.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il pulsante 'Gestisci broker...' è sostituito da un'icona ingranaggio
- [x] #2 Il click sull'icona apre il modal di gestione broker
- [x] #3 L'icona ha un attributo title='Gestisci broker' per accessibilità
- [x] #4 Nessuna nuova dipendenza aggiunta al progetto
<!-- AC:END -->
