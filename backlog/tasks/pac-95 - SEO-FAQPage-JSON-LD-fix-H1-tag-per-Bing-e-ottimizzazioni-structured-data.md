---
id: PAC-95
title: 'SEO - FAQPage JSON-LD, fix H1 tag per Bing e ottimizzazioni structured data'
status: In Progress
assignee: []
created_date: '2026-03-30 07:57'
updated_date: '2026-03-30 10:42'
labels:
  - seo
  - structured-data
  - landing
  - bing
dependencies: []
references:
  - >-
    https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=it
  - 'https://search.google.com/test/rich-results'
  - 'https://validator.schema.org/'
documentation:
  - pac-dashboard/src/i18n/it.js
  - pac-dashboard/src/components/LandingPage.jsx
  - pac-dashboard/index.html
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contesto

La landing page (`LandingPage.jsx`) contiene già una sezione FAQ con 7 domande/risposte e un accordion interattivo. L'attuale implementazione usa il formato **microdata** (`itemScope`/`itemProp`) inline nel JSX.

> **Nota**: il blocco `<script type="application/ld+json">` FAQPage è già presente in `index.html` (aggiunto in un commit precedente). Verificare che sia corretto e aggiornato rispetto alle FAQ in `it.js`.

### Problemi attuali

1. **Microdata residuo in JSX**: L'accordion FAQ in `LandingPage.jsx` usa ancora `itemScope`/`itemType`/`itemProp`. Va rimosso per evitare duplicazioni con il JSON-LD in `<head>`.
2. **Risposte non nel DOM iniziale**: Le risposte dell'accordion sono condizionali (`{isOpen && <div>...</div>}`). Bingbot e Googlebot potrebbero non vederle se il rendering è lazy.
3. **H1 tag mancante per Bing** *(segnalato da Bing Webmaster Tools)*: Bingbot riporta errore `H1 tag missing`. Il `<h1>` esiste in `LandingPage.jsx` (riga 324) ma è renderizzato da React — Bingbot non esegue JavaScript in modo completo e quindi non lo vede nel DOM statico. `index.html` body contiene solo `<div id="root"></div>`.
4. **Pagina con reindirizzamento** *(segnalato da Google Search Console — Controllo URL)*: Google rileva che l'URL testato è non canonico e reindirizza a un altro URL, quindi non verrà indicizzato. Questo è tipicamente causato da:
   - `http://etflens.app` → `https://etflens.app`
   - `www.etflens.app` → `etflens.app` (o viceversa)
   - Trailing slash: `etflens.app/` → `etflens.app`
   
   Google precisa che questo è un **avviso** (non blocca l'indicizzazione dell'URL canonico), ma riduce la capacità di Google di comprendere e indicizzare le pagine. L'URL canonico destinatario del redirect potrebbe o meno essere indicizzato.

---

## Obiettivo

Correggere i problemi SEO tecnici rilevati da Google e Bing per migliorare l'indicizzazione e abilitare i Rich Results.

---

## Interventi da implementare

### 1. Fix H1 per Bingbot — `index.html`

Aggiungere un `<h1>` statico nel `<body>` di `index.html`, visivamente nascosto ma leggibile dai crawler. Bingbot richiede che il tag sia presente nella sorgente HTML statica, non solo nel DOM renderizzato da JS.

**Requisiti Bing per l'H1:**
- Deve riflettere il tema/topic principale della pagina
- Deve contenere le keyword primarie presenti in `<title>` e `<meta description>`
- Non deve superare ~150 caratteri
- Deve stare nel `<body>` della pagina

**Soluzione consigliata**: aggiungere un H1 nascosto visivamente (ma accessibile ai crawler) prima di `<div id="root">`:

```html
<body>
  <h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">
    ETF Lens — Tracker gratuito per portafoglio ETF e piano di accumulo (PAC)
  </h1>
  <div id="root"></div>
  ...
</body>
```

> **Nota**: il testo deve essere coerente con il `<title>` e con l'H1 visibile in `LandingPage.jsx` (verificare la chiave `hero_title` in `it.js`).

### 2. Fix redirect / URL canonico — Vercel + `index.html`

**Investigare la causa del redirect** tramite Google Search Console → Controllo URL:
- Qual è l'URL non canonico segnalato? (probabile: `www.etflens.app`, `http://etflens.app`, o con trailing slash)
- Dove reindirizza?

**Azioni correttive possibili:**

**A) Vercel config (`vercel.json`)**: assicurarsi che il redirect da `www` a non-`www` (o viceversa) sia configurato come redirect **permanente 301** e che l'URL destinazione corrisponda al `<link rel="canonical">` in `index.html`.

```json
{
  "redirects": [
    {
      "source": "https://www.etflens.app/(.*)",
      "destination": "https://etflens.app/$1",
      "permanent": true
    }
  ]
}
```

**B) Canonical coerente**: verificare che `<link rel="canonical" href="https://etflens.app">` in `index.html` punti esattamente all'URL finale (senza www, con https, senza trailing slash) — deve corrispondere all'URL destinazione di tutti i redirect.

**C) Sitemap**: verificare che `sitemap.xml` contenga solo l'URL canonico finale (es. `https://etflens.app/`), mai la variante con `www` o `http`.

> **Nota Google**: il problema è classificato come **avviso**, non errore critico. Non impedisce l'indicizzazione dell'URL canonico corretto, ma va comunque risolto per chiarezza e coerenza del segnale SEO.

### 3. Pulizia microdata da `LandingPage.jsx`

Rimuovere gli attributi microdata dall'accordion FAQ (`itemScope`, `itemType`, `itemProp`) perché ridondanti rispetto al JSON-LD in `<head>`.

### 4. Garantire visibilità risposte a Bingbot e Googlebot

Le risposte dell'accordion sono nel DOM solo quando aperte (`{isOpen && ...}`). Valutare:
- **Opzione A (consigliata)**: Rendere le risposte sempre nel DOM ma nasconderle con CSS (`height: 0`, `overflow: hidden`) — così i crawler le vedono senza JS interattivo.
- **Opzione B**: Lasciare l'accordion così com'è, affidando la visibilità al JSON-LD in `<head>` — sufficiente per Google Rich Results ma meno robusto per Bingbot.

### 5. Verifica JSON-LD FAQPage esistente

Il blocco JSON-LD è già in `index.html` ma controllare:
- Che le 7 domande/risposte corrispondano a quelle attuali in `src/i18n/it.js`
- Che la struttura rispetti le linee guida Google (`@type: FAQPage`, `mainEntity`, `Question`, `acceptedAnswer`)

---

## File coinvolti

- `pac-dashboard/index.html` — aggiungere H1 statico nascosto, verificare JSON-LD FAQPage, verificare canonical
- `pac-dashboard/src/components/LandingPage.jsx` — rimuovere microdata, eventuale fix visibilità accordion
- `pac-dashboard/src/i18n/it.js` — fonte delle 7 FAQ e dell'H1 visibile (read-only, solo riferimento)
- `vercel.json` (se esiste) — verificare redirect permanenti www → non-www

---

## Verifica finale

- **Google Search Console → Controllo URL**: `https://etflens.app` deve mostrare "URL indicizzato" senza avvisi di redirect
- **Bing Webmaster Tools** → URL Inspection: verificare che l'H1 venga rilevato
- **Google Rich Results Test**: https://search.google.com/test/rich-results — tutte e 7 le FAQ devono apparire
- **Schema.org Validator**: https://validator.schema.org/
- Nessuna regressione visiva sull'accordion FAQ in light/dark mode
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Blocco `<script type="application/ld+json">` con `@type: FAQPage` presente in `index.html` con tutte e 7 le FAQ in italiano
- [ ] #2 Il JSON-LD supera il test Google Rich Results Test senza errori critici
- [x] #3 Il contenuto del JSON-LD corrisponde esattamente al testo visibile nella sezione FAQ della landing page
- [x] #4 Attributi microdata (`itemScope`, `itemType`, `itemProp`) rimossi da `LandingPage.jsx`
- [x] #5 Le risposte dell'accordion sono accessibili a Googlebot (DOM sempre presente o JSON-LD in head sufficiente)
- [x] #6 Nessuna regressione visiva sull'accordion FAQ in light mode e dark mode
- [x] #7 H1 tag statico presente in `index.html` body con keyword primarie (max ~150 caratteri), non visibile all'utente ma leggibile da Bingbot
- [ ] #8 Bing Webmaster Tools non segnala più l'errore H1 tag missing dopo re-crawl
- [x] #9 L'URL non canonico segnalato da Google Search Console (www o http) reindirizza con 301 permanente all'URL canonico `https://etflens.app`
- [x] #10 `<link rel="canonical">` in `index.html` e URL in `sitemap.xml` corrispondono esattamente all'URL finale (no www, https, no trailing slash)
- [ ] #11 Google Search Console non segnala più l'avviso 'Pagina con reindirizzamento' per l'URL canonico principale
- [ ] #12 Dopo aver risolto redirect e canonical, richiedere indicizzazione manuale via Google Search Console per l'URL canonico principale
- [x] #13 `robots.txt` non blocca file JS/CSS necessari al rendering React (Googlebot deve poter eseguire il bundle)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di implementazione

### Analisi dello stato attuale

| Elemento | Stato |
|---|---|
| JSON-LD FAQPage in `index.html` | Presente, ma FAQ #7 non corrisponde al testo in `it.js` |
| Microdata in `LandingPage.jsx` | Ancora presenti — da rimuovere |
| Accordion risposte nel DOM | Condizionali (`{isOpen && ...}`) — i crawler non le vedono |
| H1 statico in `index.html` | Assente |
| Redirect www → non-www in `vercel.json` | Assente — solo `rewrites`, nessun `redirects` |
| Canonical vs sitemap (trailing slash) | Mismatch: canonical = `https://etflens.app`, sitemap = `https://etflens.app/` |
| `robots.txt` blocca JS/CSS | No — già corretto (AC #13 soddisfatto) |

---

### Step 1 — `vercel.json`: aggiungere redirect www → non-www (301)

Aggiungere la sezione `redirects` per consolidare il traffico sull'URL canonico:

```json
"redirects": [
  {
    "source": "https://www.etflens.app/:path*",
    "destination": "https://etflens.app/:path*",
    "permanent": true
  }
]
```

Risolve: AC #9. Impatto indiretto: riduce URL duplicati nel crawl budget (AC #12).

---

### Step 2 — `public/sitemap.xml`: allineare trailing slash al canonical

Il canonical in `index.html` è `https://etflens.app` (senza slash), la sitemap ha `https://etflens.app/` (con slash). Rimuovere il trailing slash dalla sitemap per allinearlo al canonical esistente.

Risolve: AC #10.

---

### Step 3 — `index.html`: aggiungere H1 statico nascosto nel body

Prima di `<div id="root">`:

```html
<body>
  <h1 style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">
    ETF Lens — Tracker gratuito per portafoglio ETF e piano di accumulo (PAC)
  </h1>
  <div id="root"></div>
  ...
</body>
```

Risolve: AC #7.

---

### Step 4 — `index.html`: allineare testo FAQ #7 nel JSON-LD

Il testo attuale della FAQ #7 nel JSON-LD è semplificato rispetto a `it.js` (`faq_7_a`). Aggiornarlo con il testo completo per rispettare il requisito Google di corrispondenza tra JSON-LD e contenuto visibile.

Risolve: AC #3.

---

### Step 5 — `LandingPage.jsx`: rimuovere microdata + fix visibilità accordion

1. **Rimuovere** tutti gli attributi `itemScope`, `itemType`, `itemProp` dall'accordion FAQ (ridondanti con il JSON-LD in `<head>`)
2. **Fix accordion**: rendere le risposte sempre presenti nel DOM, nascondendole con CSS (`max-height: 0; overflow: hidden`) anziché rimuoverle con `{isOpen && ...}` — così Bingbot e Googlebot le vedono senza eseguire JS interattivo

Risolve: AC #4, AC #5, AC #6.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Problema aggiuntivo: 'Rilevata, ma attualmente non indicizzata' (Google Search Console)

Google ha trovato alcune URL del sito ma non le ha ancora scansionate — l'operazione sembrava sovraccaricare il server, quindi Google ha riprogrammato la scansione (la data ultima scansione non è presente nel report).

### Cause probabili per un sito su Vercel (SPA React)

- **Crawl budget esaurito**: Google limita la frequenza di scansione se il server risponde lentamente o con errori durante il crawling
- **Risorse bloccate in `robots.txt`**: Bingbot/Googlebot potrebbe essere limitato su file JS/CSS necessari al rendering
- **Pagine duplicate o parametri URL**: Vercel potrebbe servire la stessa pagina su URL multipli (con/senza trailing slash, www/non-www) gonfiando il crawl budget
- **Server cold start**: le funzioni serverless Vercel possono avere cold start lenti che Googlebot interpreta come sovraccarico

### Azioni correttive da valutare

1. **Verificare `robots.txt`**: assicurarsi che JS/CSS non siano bloccati (Googlebot deve renderizzare React per vedere il contenuto)
2. **Consolidare gli URL duplicati**: il fix redirect 301 (AC #9) aiuta direttamente — meno URL duplicati = più crawl budget per le pagine reali
3. **Richiedere scansione manuale**: dopo aver risolto redirect e canonical, usare Google Search Console → Controllo URL → 'Richiedi indicizzazione' sull'URL canonico
4. **Sitemap aggiornata**: assicurarsi che `sitemap.xml` contenga solo le URL canoniche prioritarie e che sia referenziata in `robots.txt`
5. **Vercel Edge Network**: non richiede azioni specifiche — Vercel serve già asset statici velocemente; il problema è più probabile legato ai duplicati URL che al server speed

## Esecuzione completata (2026-03-30)

### Modifiche effettuate

**`vercel.json`**: aggiunta sezione `redirects` con redirect 301 permanente da `www.etflens.app` a `etflens.app` usando il matcher `has: [{ type: host, value: www.etflens.app }]` (sintassi corretta per Vercel). Risolve AC #9.

**`public/sitemap.xml`**: rimosso trailing slash da `https://etflens.app/` → `https://etflens.app` per allineamento con canonical in `index.html`. Risolve AC #10.

**`index.html`**: aggiunto `<h1>` statico nascosto nel body prima di `<div id='root'>` con stile screen-reader-only. Aggiornato testo FAQ #7 nel JSON-LD con il testo completo da `it.js` (corrispondenza esatta con il visibile). Risolve AC #7, AC #3.

**`LandingPage.jsx`**: rimossi tutti gli attributi microdata (`itemScope`, `itemType`, `itemProp`) dalla sezione FAQ. Sostituito `{isOpen && <div>...</div>}` con elemento sempre nel DOM, nascosto via `maxHeight: 0 / overflow: hidden` quando chiuso. Animazione `transition-all duration-200`. Risolve AC #4, AC #5, AC #6.

### AC non verificabili localmente (richiedono re-crawl)
- AC #2: Rich Results Test — da eseguire su https://search.google.com/test/rich-results dopo deploy
- AC #8: Bing H1 — da verificare in Bing Webmaster Tools dopo re-crawl
- AC #11: avviso redirect Google — da verificare in Search Console dopo re-crawl
- AC #12: richiedere indicizzazione manuale via Search Console dopo deploy
- AC #13: robots.txt — già corretto (non blocca JS/CSS)
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementati tutti i fix SEO tecnici previsti dal piano.\n\n**Modifiche**: `vercel.json` (redirect 301 www→non-www), `sitemap.xml` (trailing slash rimosso), `index.html` (H1 statico nascosto + FAQ #7 JSON-LD allineata), `LandingPage.jsx` (microdata rimossi, accordion sempre nel DOM con CSS max-height).\n\n**Dopo il deploy**: eseguire Google Rich Results Test, richiedere indicizzazione manuale in Search Console, verificare H1 in Bing Webmaster Tools.
<!-- SECTION:FINAL_SUMMARY:END -->
