---
id: PAC-22
title: 'Docs: creare README in inglese con badge versione'
status: Done
assignee: []
created_date: '2026-03-12 07:35'
updated_date: '2026-03-13 17:08'
labels: []
dependencies: []
references:
  - pac-dashboard/package.json
  - spec/
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il progetto non ha un README alla root. Va creato in inglese con badge versione collegato a `package.json`.

**Contenuto minimo del README** (`README.md` nella root del repo):
- Titolo e breve descrizione dell'app (PAC Dashboard — ETF portfolio tracker)
- Badge versione (`version` da `pac-dashboard/package.json`, attualmente `0.0.0`)
- Stack tecnologico (React, Vite, Tailwind CSS, Recharts, Supabase)
- Sezione Quick Start (`npm install` + `npm run dev`)
- Variabili d'ambiente richieste (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- Link alla cartella `spec/` per la documentazione tecnica di dettaglio
- Link al deploy (Vercel)

**Badge versione**:
- Usare un badge statico Shields.io che legge la versione da `pac-dashboard/package.json`
- Formato: `![version](https://img.shields.io/badge/version-0.0.0-blue)` oppure badge dinamico `package.json` se il repo è pubblico

**Note**:
- Il README va in inglese (lingua internazionale); la documentazione tecnica in `spec/` rimane in italiano
- La versione in `package.json` è da aggiornare a `1.0.0` contestualmente
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 README.md creato alla root del repository
- [x] #2 Il README è scritto in inglese
- [x] #3 Presente un badge versione coerente con il valore in pac-dashboard/package.json
- [x] #4 Il README include stack, quick start e variabili d'ambiente
- [x] #5 Presente link alla cartella spec/ e al deploy Vercel
<!-- AC:END -->
