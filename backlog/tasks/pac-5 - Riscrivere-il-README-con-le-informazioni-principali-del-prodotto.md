---
id: PAC-5
title: Riscrivere il README con le informazioni principali del prodotto
status: Done
assignee: []
created_date: '2026-03-10 15:34'
updated_date: '2026-03-10 15:42'
labels:
  - docs
dependencies: []
references:
  - README.md
  - spec/function.md
  - spec/model.md
  - spec/deploy.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il README attuale è incompleto o assente. Riscriverlo con le informazioni essenziali per chi scopre il progetto, attingendo dalla documentazione in `spec/`.

### Struttura suggerita

1. **Titolo + descrizione breve** — cos'è PAC Dashboard in 2-3 righe
2. **Screenshot** (opzionale, placeholder se non disponibile)
3. **Funzionalità principali** — lista sintetica (ETF, acquisti, grafico, scenari, indicatori)
4. **Stack tecnologico** — React, Vite, Tailwind, Recharts, Supabase, Vercel
5. **Prerequisiti e setup locale** — clone, `npm install`, variabili d'ambiente, `npm run dev`
6. **Variabili d'ambiente** — `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
7. **Deploy** — collegamento Vercel + variabili
8. **Licenza** — MIT
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il README descrive chiaramente lo scopo dell'applicazione
- [x] #2 Sono elencate le funzionalità principali in modo sintetico
- [x] #3 Sono documentati i passi per il setup locale (clone, install, env, dev)
- [x] #4 Sono indicate le variabili d'ambiente richieste
- [x] #5 È presente la sezione licenza MIT
- [x] #6 Il contenuto è coerente con quanto descritto in spec/
<!-- AC:END -->
