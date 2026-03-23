---
id: PAC-90
title: SEO & GEO - Ottimizzazione per motori di ricerca e LLM
status: To Do
assignee: []
created_date: '2026-03-23 15:28'
labels:
  - seo
  - geo
  - marketing
  - llm
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Migliorare la visibilità di ETF Lens sui motori di ricerca tradizionali (Google, Bing) e sui motori di risposta AI (ChatGPT, Claude, Perplexity, Gemini) — noto come GEO (Generative Engine Optimization).

## Keyword target

### Primarie
- ETF, PAC, piano di accumulo capitale
- portafoglio ETF, tracker ETF
- finanza personale, investimenti ETF

### Secondarie
- rendimento ETF, CAGR, ROI investimenti
- asset allocation, diversificazione portafoglio
- piano di investimento mensile
- ETF tracker gratuito, gestione portafoglio ETF

### Long tail
- "come tracciare il mio portafoglio ETF"
- "calcolare rendimento piano di accumulo"
- "proiezione investimento ETF scenari"

## Interventi da implementare

### 1. Meta tag (index.html + pagine statiche)
- `<title>` descrittivo con keyword: es. `ETF Lens — Tracker gratuito per portafoglio ETF e PAC`
- `<meta name="description">` (150–160 caratteri) con keyword primarie
- `<meta name="keywords">` (valore limitato ma utile per LLM)
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`)
- Twitter Card (`twitter:card`, `twitter:title`, `twitter:description`)

### 2. Structured data JSON-LD (index.html)
- Schema `WebApplication` con `applicationCategory: "FinanceApplication"`
- Schema `SoftwareApplication` con `offers`, `featureList`

### 3. File llms.txt
- Creare `/public/llms.txt` — file standard emergente per istruire gli LLM su cosa è il sito
- Contenuto: descrizione del prodotto, keyword, use case, link alle pagine chiave

### 4. sitemap.xml
- Creare `/public/sitemap.xml` con le URL principali: `/`, `/privacy`, `/termini`

### 5. robots.txt
- Verificare/creare `/public/robots.txt` con `Sitemap:` reference
- Permettere crawling ai bot AI (GPTBot, ClaudeBot, PerplexityBot, ecc.)

### 6. Canonical e lang
- `<link rel="canonical">` su ogni pagina
- `<html lang="it">` già presente, verificare coerenza

### 7. Landing page (LandingPage.jsx)
- Verificare che i testi usino le keyword in modo naturale nei tag semantici (`h1`, `h2`, `p`)
- Aggiungere una sezione FAQ con domande/risposte su ETF e PAC (ottimo per snippet e LLM)

## Note
- Le pagine `/privacy` e `/termini` sono HTML statici: i meta tag vanno aggiunti direttamente lì
- La landing page e l'app sono React: i meta tag vanno in `index.html` (SPA single page)
- Per il GEO, la chiarezza e la struttura del contenuto contano più delle keyword ripetute
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Meta tag title e description ottimizzati su tutte le pagine (index, privacy, termini)
- [ ] #2 Open Graph e Twitter Card configurati
- [ ] #3 JSON-LD WebApplication presente in index.html
- [ ] #4 File llms.txt creato e accessibile su /llms.txt
- [ ] #5 sitemap.xml creato e referenziato in robots.txt
- [ ] #6 robots.txt permette i principali bot AI
- [ ] #7 Landing page usa le keyword primarie nei tag semantici h1/h2
<!-- AC:END -->
