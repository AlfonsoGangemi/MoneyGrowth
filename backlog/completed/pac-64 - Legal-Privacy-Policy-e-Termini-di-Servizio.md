---
id: PAC-64
title: 'Legal: Privacy Policy e Termini di Servizio'
status: Done
assignee: []
created_date: '2026-03-15 09:47'
updated_date: '2026-03-15 12:09'
labels:
  - legal
  - gdpr
  - release
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Obbligatorio per legge (GDPR) prima di aprire il servizio al pubblico.

## Cosa creare

1. **Pagina `/privacy`** — Privacy Policy con:
   - Titolare del trattamento dati
   - Dati raccolti (email, dati finanziari inseriti dall'utente)
   - Finalità del trattamento
   - Provider terzi: Supabase (hosting dati), Vercel (hosting applicazione)
   - Diritti dell'utente (accesso, cancellazione, portabilità)
   - Periodo di conservazione
   - Contatti

2. **Pagina `/termini`** — Termini di Servizio con:
   - Descrizione del servizio (tool personale, nessuna consulenza finanziaria)
   - Limitazione di responsabilità sui dati finanziari mostrati
   - Condizioni di utilizzo
   - Cancellazione account

3. **Link in AuthForm** — aggiungere sotto il pulsante "Registrati" testo: *"Registrandoti accetti i [Termini di Servizio] e la [Privacy Policy]"*

## Note
- I dati finanziari sono inseriti dall'utente stesso, non raccolti da fonti esterne
- Supabase è il sub-processor dei dati (data processor agreement già incluso nei ToS Supabase)
- Il servizio è gratuito, nessun pagamento coinvolto
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Pagina /privacy accessibile e completa (GDPR)
- [x] #2 Pagina /termini accessibile con disclaimer su dati finanziari
- [x] #3 Link a entrambe le pagine nel form di registrazione (AuthForm)
- [x] #4 Link nel footer dell'applicazione
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
# Piano implementativo PAC-64

## Analisi architettura

`App.jsx` usa rendering condizionale semplice (no react-router-dom). Le pagine `/privacy` e `/termini` devono essere accessibili via URL diretto anche senza autenticazione.

**Approccio scelto: HTML statici in `public/`**
- `public/privacy.html` e `public/termini.html` — serviti direttamente da Vercel come file statici
- Nessuna dipendenza aggiuntiva (no react-router-dom)
- Stile dark coerente con l'app, tutto inline
- Link in AuthForm e Dashboard puntano a `/privacy` e `/termini` con `target="_blank"`

Alternativa scartata: aggiungere react-router-dom solo per due pagine statiche è over-engineering.

---

## Contenuto Privacy Policy (GDPR art. 13)

- Titolare del trattamento: `[NOME TITOLARE]`, `[EMAIL CONTATTO]`
- Dati raccolti: email (registrazione via Supabase Auth), dati finanziari inseriti manualmente (ETF, acquisti, importi, broker)
- Finalità: erogazione del servizio di tracking PAC
- Base giuridica: esecuzione del contratto (art. 6.1.b GDPR)
- Sub-processor: Supabase Inc. (dati su infrastruttura EU), Vercel Inc. (hosting SPA)
- Conservazione: fino alla cancellazione dell'account
- Diritti utente: accesso (art. 15), rettifica (art. 16), cancellazione (art. 17), portabilità tramite export JSON (art. 20)
- Contatti per esercizio diritti: `[EMAIL CONTATTO]`

## Contenuto Termini di Servizio

- Descrizione: tool personale gratuito di tracking PAC, nessuna consulenza finanziaria
- Disclaimer: i valori mostrati (prezzi ETF, proiezioni) hanno scopo puramente informativo e non costituiscono raccomandazione di investimento
- Limitazione responsabilità: prezzi ETF da JustETF, non garantiti in accuratezza o tempestività
- Responsabilità utente: correttezza dei dati inseriti (acquisti, importi)
- Cancellazione account: richiesta via email a `[EMAIL CONTATTO]`

---

## File da creare / modificare

| File | Operazione |
|---|---|
| `public/privacy.html` | Crea — Privacy Policy HTML statico, stile dark |
| `public/termini.html` | Crea — Termini di Servizio HTML statico, stile dark |
| `src/components/AuthForm.jsx` | Modifica — link sotto pulsante "Registrati" (solo tab register) |
| `src/components/Dashboard.jsx` | Modifica — footer con link /privacy e /termini |

---

## Dettaglio modifiche React

### AuthForm.jsx
Aggiungere sotto il `<button type="submit">`, visibile solo quando `tab === 'register'`:
```jsx
{tab === 'register' && (
  <p className="text-xs text-slate-500 text-center">
    Registrandoti accetti i{' '}
    <a href="/termini" target="_blank" className="underline hover:text-slate-300">Termini di Servizio</a>
    {' '}e la{' '}
    <a href="/privacy" target="_blank" className="underline hover:text-slate-300">Privacy Policy</a>.
  </p>
)}
```

### Dashboard.jsx
Aggiungere `<footer>` prima della chiusura del `<div>` root:
```jsx
<footer className="border-t border-slate-800 mt-12 py-4">
  <div className="max-w-7xl mx-auto px-4 flex gap-4 justify-center text-xs text-slate-600">
    <a href="/privacy" target="_blank" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
    <a href="/termini" target="_blank" className="hover:text-slate-400 transition-colors">Termini di Servizio</a>
  </div>
</footer>
```

---

## Placeholder da compilare prima del go-live

I file HTML conterranno i seguenti placeholder che l'utente deve sostituire:

- `[NOME TITOLARE]` — nome e cognome del titolare del trattamento
- `[EMAIL CONTATTO]` — email per richieste GDPR e assistenza
- `[URL SITO]` — URL di produzione (es. https://pac-dashboard.vercel.app)
- `[DATA AGGIORNAMENTO]` — data ultima revisione del documento

---

## Step eseguibili autonomamente
1. Creare `public/privacy.html`
2. Creare `public/termini.html`
3. Modificare `AuthForm.jsx`
4. Modificare `Dashboard.jsx`

Tutti i 4 step sono autonomi. I placeholder vanno compilati dall'utente prima del deploy pubblico.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Creati `public/privacy.html` e `public/termini.html` come file statici serviti direttamente da Vercel (no react-router-dom). Entrambi con stile dark coerente all'app. Privacy Policy conforme GDPR art. 13 (titolare, dati raccolti, Supabase/Vercel come sub-processor, diritti utente artt. 15-22). Termini con disclaimer esplicito di non-consulenza finanziaria e limitazione responsabilità su prezzi JustETF. Aggiunto link "Registrandoti accetti..." in AuthForm.jsx (visibile solo tab register). Aggiunto footer minimale in Dashboard.jsx con link /privacy e /termini. Placeholder da compilare prima del go-live: [NOME TITOLARE], [EMAIL CONTATTO], [URL SITO], [DATA AGGIORNAMENTO].
<!-- SECTION:FINAL_SUMMARY:END -->
