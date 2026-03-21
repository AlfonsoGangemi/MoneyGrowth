---
id: PAC-83
title: 'Rebrand: modifiche necessarie visibili agli utenti (ETF Lens / etflens.app)'
status: Done
assignee: []
created_date: '2026-03-21 14:52'
updated_date: '2026-03-21 15:20'
labels:
  - rebrand
  - ux
  - i18n
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiornare tutte le occorrenze visibili agli utenti del nome "PAC Dashboard" con il nuovo brand **ETF Lens** e il dominio **etflens.app**.

## Motivazione
L'app non è solo un tracker PAC ma uno strumento di gestione ETF multi-broker con integrazione JustETF. Il nome "ETF Lens" è più rappresentativo, neutro rispetto al concetto PAC, e facile da ricordare in italiano e inglese.

## File da modificare

### Meta tag e HTML base
- `pac-dashboard/index.html`: `<title>`, 3x description, OG title/url/image, Twitter title/image
  - Nuovo URL: `https://etflens.app`
  - Nuova descrizione: orientata a "gestione ETF multi-broker"

### Componenti UI
- `pac-dashboard/src/components/AuthForm.jsx` riga 81: header login
- `pac-dashboard/src/components/Dashboard.jsx` riga 498: header navbar
- `pac-dashboard/src/components/LandingPage.jsx` righe 116, 285, 382: titolo, footer, heading
- `pac-dashboard/src/components/Privacy.jsx`: breadcrumb "← PAC Dashboard"
- `pac-dashboard/src/components/Termini.jsx`: 4 occorrenze nel testo legale + breadcrumb

### i18n (it.js + en.js)
- `nav_title`: `'PAC Dashboard'` → `'ETF Lens'`
- `auth_subtitle`: `'Piano di Accumulo Capitale'` → sottotitolo più generico (es. "Gestione ETF multi-broker")
- `hero_title`: riformulare senza "Piano di Accumulo"
- Valutare generalizzazione label form:
  - `label_importo_pac`: `'Importo PAC mensile (€)'` → `'Rata mensile (€)'`
  - `pac_mensile`: `'PAC mensile'` → `'Rata mensile'`
  - `nuovo_acquisto`: `'Nuovo acquisto PAC'` → `'Nuovo acquisto'`

### Documenti legali statici
- `pac-dashboard/public/privacy.html`: aggiornare nome app e descrizione servizio
- `pac-dashboard/public/termini.html`: aggiornare nome app e descrizione servizio

### README
Il README esiste in `README.md` (root del repository). Il link `https://etflens.app` è già stato aggiunto. Aggiornare anche:
- Titolo: `# MoneyGrowth — PAC Dashboard` → `# MoneyGrowth — ETF Lens`
- Descrizione: aggiornare da `"Capital Accumulation Plan (PAC)"` → `"multi-broker ETF management"`

## Note
- Non rinominare la cartella `pac-dashboard/`, il progetto Supabase, Sentry o Vercel (vedi task separato)
- Il termine "PAC" nei commenti tecnici di `calcoli.js` può restare (terminologia finanziaria, non brand)
- Verificare favicon/og-image: se contengono testo "PAC Dashboard" vanno rigenerati
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nessuna occorrenza di 'PAC Dashboard' visibile nell'UI (navbar, login, landing, footer)
- [ ] #2 Meta tag title/description/OG aggiornati con nome ETF Lens e URL https://etflens.app
- [ ] #3 File i18n it.js e en.js aggiornati (nav_title, auth_subtitle, hero_title, label form PAC)
- [ ] #4 Documenti legali (privacy.html, termini.html, Privacy.jsx, Termini.jsx) aggiornati con nuovo nome
- [ ] #5 Label dei form generalizzate (niente riferimento a PAC nelle etichette visibili all'utente)
- [ ] #6 README.md (root) aggiornato: titolo ETF Lens, URL https://etflens.app già aggiunto
- [ ] #7 Build senza errori dopo le modifiche
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rebrand completato: tutte le occorrenze di "PAC Dashboard" sostituite con "ETF Lens" in src/, public/, index.html e README.md. Dashboard.jsx aggiornato per usare t('nav_title') invece del testo hardcoded. i18n aggiornato (nav_title, auth_subtitle, hero_title, label_importo_pac, pac_mensile, nuovo_acquisto in it.js e en.js). URL aggiornati a https://etflens.app in index.html, privacy.html e termini.html.
<!-- SECTION:FINAL_SUMMARY:END -->
