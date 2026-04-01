---
id: DRAFT-2
title: 'Feature: integrazione prezzi live via WebSocket ExtraETF'
status: Draft
assignee: []
created_date: '2026-04-01 08:25'
updated_date: '2026-04-01 09:09'
labels:
  - feature
  - infrastructure
  - experimental
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/api/justetf-proxy.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Sostituire l'inserimento manuale del prezzo corrente con aggiornamenti automatici in tempo reale tramite il WebSocket `wss://quotes.extraetf.com/v1/ws`.

## Comportamento attuale

- L'utente inserisce manualmente `prezzoCorrente` nel form ETF (Dashboard.jsx)
- Il valore viene salvato su `etf.prezzo_corrente` (Supabase) e su `etf_prezzi_storici`
- Non esiste aggiornamento automatico dei prezzi

## Soluzione proposta

### Fase 1 — Hook sperimentale (in-memory, no persistenza)

Creare un hook `useETFQuotes` che:
- Apre la connessione WS al mount del portafoglio
- Si iscrive a tutti gli ISIN presenti: `{"subscribe":{"isins":[...]}}`
- Aggiorna `prezzoCorrente` nello stato locale React ad ogni tick ricevuto
- Non scrive su Supabase (nessun impatto sul modello dati)
- Gestisce reconnection automatica e cleanup on unmount
- Fallback graceful: se il WS non risponde, usa il `prezzoCorrente` da Supabase come oggi

### Fase 2 — Persistenza opzionale (da valutare dopo Fase 1)

Decidere se e quando scrivere il prezzo ricevuto via WS su `etf.prezzo_corrente` in Supabase (es. on-demand, a intervalli, o alla chiusura sessione).

## Rischi noti

- API non ufficiale/non documentata: potrebbe cambiare formato, aggiungere autenticazione o bloccare origin non autorizzate senza preavviso
- Verificare che `etflens.app` non venga bloccato per origin check lato server
- Prezzi significativi solo durante orari di borsa; fuori orario il feed può essere assente o flat
- Due sorgenti di verità per `prezzoCorrente` (DB + WS): la UI deve dare priorità esplicita al valore live

## Note architetturali

- `etf_prezzi_storici` rimane invariato — serve per il grafico storico, non riceve dati WS
- Il proxy `api/justetf-proxy.js` (PAC-69) rimane attivo per le altre funzionalità REST
- Il campo manuale `prezzo_corrente_eur` nel form ETF può essere mantenuto come override esplicito
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 L'hook `useETFQuotes` apre la connessione WS e si iscrive a tutti gli ISIN del portafoglio al mount
- [ ] #2 Ogni messaggio ricevuto aggiorna `prezzoCorrente` nello stato React locale senza scrittura su Supabase
- [ ] #3 Se il WS non è raggiungibile o la connessione cade, il prezzo visualizzato rimane quello salvato su Supabase (fallback silenzioso)
- [ ] #4 La connessione WS viene chiusa correttamente all'unmount del componente (no memory leak)
- [ ] #5 ETFCard mostra un indicatore visivo (es. badge 'live') quando il prezzo proviene dal WS
- [ ] #6 I calcoli PAC (calcoli.js, portafoglio_storico_annuale) continuano a usare il prezzo da Supabase, non il prezzo live
- [ ] #7 Verificato che il WebSocket funzioni dal dominio di produzione etflens.app senza blocco origin
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Protocollo WebSocket ExtraETF

**Endpoint:** `wss://quotes.extraetf.com/v1/ws`

**Autenticazione:** nessuna — ma il server verifica l'`Origin` header. Testato: funziona con `Origin: https://extraetf.com` da Node.js.

**Messaggi:**
```json
// Subscribe
{"subscribe":{"isins":["LU0478205379","IE00B4L5Y983"]}}

// Unsubscribe (prima di chiudere)
{"unsubscribe":{"isins":["LU0478205379","IE00B4L5Y983"]}}
```

## Architettura: polling proxy REST su Vercel

Il WS non è usabile direttamente dal browser del client (origin bloccata). Soluzione: proxy serverless Vercel che apre il WS internamente.

**Flusso:**
```
Client (ogni 60s)
  → GET /api/extraetf-quotes?isins=IE00B4L5Y983,...
    → Vercel function apre WS verso extraetf con Origin: https://extraetf.com
    → invia {"subscribe":{"isins":[...]}}
    → attende un messaggio per ogni ISIN
    → invia {"unsubscribe":{"isins":[...]}}
    → chiude WS
    → restituisce JSON con i prezzi
  → useETFQuotes aggiorna stato React (no scrittura Supabase)
```

**Vantaggi:**
- Rientra nei timeout Vercel (WS breve, non persistente)
- Stessa architettura di `justetf-proxy.js`
- Dipendenza aggiuntiva: solo pacchetto `ws` (Node.js)

**File da creare:** `pac-dashboard/api/extraetf-quotes.js`
<!-- SECTION:NOTES:END -->
