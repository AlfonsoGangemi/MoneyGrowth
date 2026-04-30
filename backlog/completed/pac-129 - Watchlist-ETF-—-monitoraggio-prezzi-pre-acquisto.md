---
id: PAC-129
title: Watchlist ETF — monitoraggio prezzi pre-acquisto
status: Done
assignee: []
created_date: '2026-04-30 11:00'
updated_date: '2026-04-30 15:18'
labels:
  - watchlist
  - etf
  - ui
  - supabase
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Aggiungere una sezione **Watchlist** separata dalla dashboard principale, che permette all'utente di monitorare il prezzo corrente di ETF che intende acquistare in futuro. La watchlist è indipendente dal portafoglio: un ISIN può comparire sia in watchlist che tra gli ETF con acquisti.

---

## Schema DB

Tabella separata `watchlist`:
```sql
CREATE TABLE watchlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isin        text NOT NULL CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{10}$'),
  nome        text,
  emittente   text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, isin)
);
```
- Limite 12 ETF per utente: validazione applicativa (COUNT prima dell'INSERT)
- RLS: utente vede/modifica solo le proprie righe
- Un ISIN può coesistere in `watchlist` e in `etf` senza conflitti

---

## Nome ETF

Al momento dell'inserimento, recuperare nome ed emittente da `api/extraetf-detail?isin=...` e salvarli nella riga `watchlist` per evitare una call a ogni render.

---

## Prezzo corrente

Usa la modalità real-time già implementata in `api/extraetf-quotes.js`:
```
GET /api/extraetf-quotes?isins=IE00B4L5Y983,LU1681043599
```
Risposta: `{ prices: { "IE00B4L5Y983": 95.42 }, missing: [] }`

Nessuna storicizzazione — solo prezzo spot al caricamento della sezione. Nessun polling automatico (l'utente aggiorna manualmente o al mount del componente).

---

## UI — sezione Watchlist

Sezione separata e sintetica, posizionata sotto la dashboard principale (o in tab dedicato). Per ogni ETF in lista:

| Campo | Fonte |
|---|---|
| ISIN | `watchlist.isin` |
| Nome / Emittente | `watchlist.nome`, `watchlist.emittente` |
| Prezzo corrente | `extraetf-quotes` real-time al mount |
| Link ExtraETF | `https://www.extraetf.com/it/etf-profile/{isin}` |
| Bottone rimuovi | DELETE su `watchlist` |

### Flusso inserimento ISIN

1. Validazione regex lato client (`^[A-Z]{2}[A-Z0-9]{10}$`) — errore immediato se non supera
2. Call a `GET /api/extraetf-detail?isin=...` — verifica che l'ISIN esista su ExtraETF
   - Se la call fallisce o restituisce dati vuoti → errore "ISIN non trovato su ExtraETF"
   - Se ha successo → `nome` ed `emittente` sono già disponibili dalla risposta, nessuna call aggiuntiva
3. INSERT su `watchlist` con `isin`, `nome`, `emittente`

Form: campo ISIN + bottone Aggiungi. Bottone disabilitato se lista è già a 12 ETF. Spinner durante la verifica ExtraETF.

---

## File da creare / modificare

- **DB**: nuova tabella `watchlist` con RLS
- **`src/hooks/useWatchlist.js`** — nuovo hook: lista, aggiungi (con verifica ExtraETF), rimuovi, fetch prezzi al mount
- **`src/components/WatchlistPanel.jsx`** — nuovo componente sezione watchlist
- **`src/components/Dashboard.jsx`** — includere `WatchlistPanel`
- **`docs/architecture.md`** — aggiornare tabelle hook e componenti
- **`docs/model.md`** — aggiornare schema DB
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 L'utente può aggiungere un ISIN alla watchlist: prima viene validato con regex, poi verificato su ExtraETF (GET /api/extraetf-detail); se l'ISIN non esiste su ExtraETF viene mostrato un errore e l'inserimento è bloccato
- [x] #2 Nome ed emittente vengono estratti dalla risposta di extraetf-detail e salvati in DB nella stessa operazione di inserimento (nessuna call aggiuntiva)
- [x] #3 La watchlist accetta al massimo 12 ETF per utente; oltre il limite il form è disabilitato e viene mostrato un messaggio
- [x] #4 Un ISIN già presente in portafoglio (tabella etf) può essere aggiunto anche alla watchlist senza conflitti
- [x] #5 Al caricamento della sezione viene recuperato il prezzo corrente di tutti gli ISIN in lista tramite extraetf-quotes real-time (nessun polling automatico)
- [x] #6 Ogni riga mostra: ISIN, nome, emittente, prezzo corrente e un link esterno alla pagina ExtraETF dell'ETF
- [x] #7 L'utente può rimuovere un ETF dalla watchlist; la rimozione è immediata lato UI e persistita in DB
- [x] #8 RLS attiva: ogni utente vede e modifica solo la propria watchlist
- [x] #9 Nessuna storicizzazione prezzi: la tabella watchlist non scrive in etf_prezzi_storici
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di implementazione

### 1. Migration Supabase

Creare `pac-dashboard/supabase/migrations/20260430000000_pac129_watchlist.sql`:

```sql
CREATE TABLE watchlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isin        text NOT NULL CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{10}$'),
  nome        text,
  emittente   text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, isin)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_select" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist_insert" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_delete" ON watchlist FOR DELETE USING (auth.uid() = user_id);
```

Applicare con `supabase db push` (progetto già linkato).

---

### 2. Hook `src/hooks/useWatchlist.js`

Stato: `{ items: [], prezzi: {}, loading: false, error: null }`

**`caricaWatchlist()`** — SELECT da `watchlist` per `user_id` corrente.

**`aggiungiETF(isin)`**
1. Validazione regex — throw se non valida
2. `GET /api/extraetf-detail?isin=...` — se risposta vuota/errore → throw `"ISIN non trovato su ExtraETF"`
3. Verifica limite 12: COUNT items correnti → throw se ≥ 12
4. INSERT su `watchlist` con `isin`, `nome`, `emittente`
5. Aggiorna stato locale ottimisticamente (o ricarica)

**`rimuoviETF(id)`** — DELETE per `id`, aggiorna stato locale.

**`aggiornaPrezzi()`** — chiama `GET /api/extraetf-quotes?isins=...` con tutti gli ISIN in lista → aggiorna `prezzi` nello stato. Chiamata al mount e su richiesta esplicita.

Eseguire `caricaWatchlist()` + `aggiornaPrezzi()` all'mount (dipendenze: `user`).

---

### 3. Componente `src/components/WatchlistPanel.jsx`

**Form inserimento**
- Input ISIN (uppercase automatico, trim)
- Bottone "Aggiungi" — disabilitato se `items.length >= 12` o `loading`
- Spinner durante la verifica ExtraETF
- Messaggio errore inline (ISIN non valido / non trovato / limite raggiunto)

**Tabella lista**

| ISIN | Nome | Emittente | Prezzo | Link | — |
|---|---|---|---|---|---|
| `isin` | `nome` | `emittente` | `prezzi[isin] ?? "—"` | ↗ ExtraETF | 🗑 |

- Link ExtraETF: `https://www.extraetf.com/it/etf-profile/{isin}` — `target="_blank" rel="noopener"`
- Bottone rimuovi per ogni riga
- Bottone "Aggiorna prezzi" per refetch manuale

**Stato vuoto**: messaggio "Nessun ETF in watchlist — aggiungi un ISIN per monitorarne il prezzo."

---

### 4. Integrazione in `src/components/Dashboard.jsx`

- Importare `WatchlistPanel` e `useWatchlist`
- Passare `user` al hook
- Rendere `<WatchlistPanel />` sotto la sezione portafoglio principale (o in tab separato se esiste già una struttura a tab)

---

### 5. i18n

Aggiungere chiavi `watchlist_*` in `src/i18n/it.js` e `src/i18n/en.js`:
- `watchlist_title`, `watchlist_add_placeholder`, `watchlist_add_btn`
- `watchlist_error_invalid_isin`, `watchlist_error_not_found`, `watchlist_error_limit`
- `watchlist_empty`, `watchlist_refresh`, `watchlist_remove`

---

### 6. Documentazione

- **`docs/architecture.md`** — aggiungere `useWatchlist.js` in tabella hook, `WatchlistPanel.jsx` in tabella componenti
- **`docs/model.md`** — aggiungere schema tabella `watchlist` nella sezione Supabase
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione completata

### File creati
- `pac-dashboard/supabase/migrations/20260430000000_pac129_watchlist.sql` — tabella `watchlist` con RLS (select/insert/delete per `user_id`), applicata con `supabase db push`
- `pac-dashboard/src/hooks/useWatchlist.js` — hook con `carica`, `aggiornaPrezzi` (al mount), `aggiungiETF` (regex → ExtraETF detail → INSERT con duplicate check), `rimuoviETF` (ottimistico)
- `pac-dashboard/src/components/WatchlistPanel.jsx` — form ISIN con auto-uppercase, tabella ISIN/nome/emittente/prezzo/link ExtraETF/rimuovi, bottone refresh, stato vuoto

### File modificati
- `pac-dashboard/src/components/Dashboard.jsx` — import `WatchlistPanel` + render sotto `TabellaProiezione`
- `pac-dashboard/src/i18n/it.js` e `en.js` — sezione `// --- Watchlist ---` con 17 chiavi
- `docs/architecture.md` — aggiunti `useWatchlist.js` e `WatchlistPanel.jsx` nelle tabelle
- `docs/model.md` — schema `watchlist` nello Schema SQL e nella sezione RLS

### Note tecniche
- Nessuna storicizzazione: la watchlist non scrive in `etf_prezzi_storici`
- Il prezzo corrente viene fetchato via WebSocket ExtraETF al mount del componente
- nome/emittente salvati all'inserimento per evitare call aggiuntive a ogni render
- Duplicate ISIN gestito via codice errore Supabase `23505` → throw `'duplicate'`
<!-- SECTION:FINAL_SUMMARY:END -->
