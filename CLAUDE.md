# PAC Dashboard — Specifica per Claude Code

## Obiettivo

Applicazione web per la gestione e visualizzazione dei rendimenti di un Piano di Accumulo Capitale (PAC) su più ETF, con proiezione futura per scenari personalizzabili. Supporta autenticazione multi-utente tramite Supabase, con dati persistiti su database cloud per utente.

---

## Stack Tecnologico

- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **Grafici**: Recharts
- **Date**: date-fns
- **Autenticazione & DB**: Supabase (Auth + PostgreSQL)
- **Persistenza**: Supabase (cloud, per-utente) + Export/Import JSON
- **Deploy**: Vercel

---

## Struttura del Progetto

```
pac-dashboard/
├── public/
└── src/
    ├── components/
    │   ├── Dashboard.jsx          # Vista principale, layout generale
    │   ├── ETFCard.jsx            # Card riepilogativa per ogni ETF
    │   ├── AcquistoForm.jsx       # Form inserimento acquisto multi-ETF
    │   ├── GraficoPortafoglio.jsx # Grafico storico reale + proiezione scenari
    │   ├── Indicatori.jsx         # ROI, CAGR, TWRR, ecc.
    │   └── AuthForm.jsx           # Login / Registrazione
    ├── hooks/
    │   ├── usePortafoglio.js      # Stato globale + CRUD Supabase
    │   └── useAuth.js             # Sessione utente Supabase
    ├── utils/
    │   ├── calcoli.js             # Tutti i calcoli finanziari
    │   └── supabase.js            # Client Supabase singleton
    ├── App.jsx                    # Root: routing auth ↔ dashboard
    └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

---

## Autenticazione

### Flusso
- All'avvio l'app controlla la sessione Supabase (`supabase.auth.getSession`)
- Se non autenticato → mostra `AuthForm` (login + registrazione con email/password)
- Se autenticato → mostra `Dashboard`
- Pulsante **Logout** in header, chiama `supabase.auth.signOut`
- La sessione è persistita automaticamente da Supabase (JWT in localStorage)

### Componente `AuthForm.jsx`
- Tab **Accedi** / **Registrati**
- Campi: email, password
- Messaggi di errore inline (es. "Email o password errati", "Email già registrata")
- Nessun flusso di recupero password nella V1 (può essere aggiunto in seguito)

### Hook `useAuth.js`
```js
// Espone:
{ user, session, loading, signIn, signUp, signOut }
```
- Sottoscrive `supabase.auth.onAuthStateChange` per aggiornamenti in tempo reale
- `loading: true` durante il primo controllo di sessione (mostra spinner)

---

## Database Supabase

### Schema SQL

```sql
-- ETF
create table etf (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  nome            text not null,
  isin            text not null,
  emittente       text default '',
  importo_fisso   numeric not null default 0,
  prezzo_corrente numeric not null default 0,
  archiviato      boolean not null default false,
  created_at      timestamptz default now()
);

-- Acquisti
create table acquisti (
  id                uuid primary key default gen_random_uuid(),
  etf_id            uuid references etf(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  data              date not null,
  importo_investito numeric not null,
  prezzo_unitario   numeric not null,
  quote_frazionate  numeric not null,
  created_at        timestamptz default now()
);

-- Scenari di proiezione
create table scenari (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  nome             text not null,
  rendimento_annuo numeric not null,
  colore           text not null
);

-- Configurazione utente
create table config (
  user_id           uuid references auth.users(id) on delete cascade primary key,
  orizzonte_anni    integer not null default 10,
  mostra_proiezione boolean not null default true
);
```

### Row Level Security (RLS)

Abilitare RLS su tutte le tabelle; ogni utente vede solo i propri dati:

```sql
alter table etf enable row level security;

create policy "utente vede i propri etf"
  on etf for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table acquisti enable row level security;

create policy "utente vede i propri acquisti"
  on acquisti for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table scenari enable row level security;

create policy "utente vede i propri scenari"
  on scenari for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table config enable row level security;

create policy "utente vede i propri config"
  on config for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

### Variabili d'ambiente

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Modello Dati (frontend)

Il modello rimane invariato rispetto alla struttura originale; il mapping da snake_case (DB) a camelCase (JS) avviene nel layer `usePortafoglio.js`.

### ETF
```json
{
  "id": "uuid",
  "nome": "iShares Core MSCI World",
  "isin": "IE00B4L5Y983",
  "emittente": "iShares",
  "importoFisso": 200,
  "prezzoCorrente": 95.40,
  "archiviato": false,
  "acquisti": []
}
```

### Acquisto
```json
{
  "id": "uuid",
  "data": "2024-01-15",
  "importoInvestito": 200,
  "prezzoUnitario": 88.20,
  "quoteFrazionate": 2.2676
}
```

### Scenario Proiezione
```json
{
  "id": "uuid",
  "nome": "Ottimistico",
  "rendimentoAnnuo": 0.10,
  "colore": "#22c55e"
}
```

---

## Persistenza con Supabase

### Hook `usePortafoglio.js` — comportamento

- Al mount (con utente autenticato): carica da Supabase tutti gli ETF dell'utente con i relativi acquisti e scenari
- Ogni mutazione (aggiungiETF, aggiornaETF, aggiungiAcquisto, ecc.) scrive **prima** su Supabase, poi aggiorna lo stato locale
- In caso di errore Supabase → mostra un toast di errore; lo stato locale non viene aggiornato
- La config utente (orizzonte anni, mostra proiezione) è sincronizzata sulla tabella `config` con upsert
- Export JSON rimane disponibile come backup manuale

### Scenari di default

Alla prima registrazione, i tre scenari di default (Pessimistico, Moderato, Ottimistico) vengono inseriti in Supabase automaticamente (`signUp` → inserimento scenari di default).

---

## Funzionalità

### Gestione ETF
- Aggiunta di fino a **5 ETF** (inclusi gli archiviati); gli ETF **non possono essere eliminati**
- Campi configurabili: nome, ISIN (solo in fase di creazione, non modificabile), emittente, importo fisso mensile PAC, prezzo corrente
- L'**emittente** viene visualizzato come sottotitolo nella card
- L'**ISIN** è un link cliccabile alla pagina JustETF dell'ETF (`https://www.justetf.com/it/etf-profile.html?isin={ISIN}#panoramica`), si apre in una nuova tab
- Accanto al prezzo corrente è presente un pulsante **aggiorna** (icona refresh) che recupera il prezzo tramite l'API pubblica di JustETF:
  - Endpoint: `GET https://www.justetf.com/api/etfs/cards?locale=it&currency=EUR&isin={ISIN}`
  - Risposta XML; il prezzo è estratto con XPath `/ETFCardsResponse/etfs/etfs/latestQuote/localized`
  - Il valore è in formato europeo (virgola decimale) e viene convertito in `number` prima del salvataggio
  - Nessuna API key richiesta
  - Gestisce gli stati visivi: caricamento (icona rotante) ed errore (icona rossa + label "Errore" per 3 s)
- Un ETF può essere **archiviato**: scompare dalla dashboard (indicatori, grafico, lista acquisti) senza essere eliminato; può essere riattivato tramite il pannello "ETF archiviati"
- Ogni ETF ha un pulsante **modifica** (✏️) che apre una modale con tutti i campi eccetto ISIN, e un pulsante **archivia** (🗄) per nasconderlo

### Inserimento Acquisti
- Il form è **multi-ETF**: un singolo acquisto PAC ha un'unica data e può includere più strumenti contemporaneamente
- Per ogni ETF attivo compare una riga con checkbox; spuntando l'ETF si espandono:
  - **Importo** (€) — pre-compilato dall'ultimo acquisto; modificabile
  - **Prezzo unitario** (€) — pre-compilato dal prezzo corrente; modificabile
  - **Quote frazionate** — calcolate automaticamente (`importo / prezzo`); non editabili
- Default data: oggi

### Grafico
- **Asse X**: tempo (storico + futuro fino a 10 anni)
- **Asse Y**: valore del portafoglio in €
- **Serie storica**: valore reale del portafoglio nel tempo
- **Serie proiezione**: una linea per ogni scenario configurato
- Grafici separati per singolo ETF e portafoglio aggregato
- Possibilità di escludere la proiezione
- Mostra solo gli ETF **non archiviati**

### Scenari Futuri
- Personalizzabili dall'utente: nome, % rendimento annuo, colore linea
- Il **rendimento annuo** è modificabile inline direttamente dal chip dello scenario (click sul valore percentuale)
- Orizzonte temporale: da 1 a 10 anni (configurabile)
- Importo PAC futuro: uguale all'ultimo importo fisso configurato per ogni ETF attivo
- Calcolo con capitalizzazione composta mensile

### Indicatori di Portafoglio

| Indicatore | Descrizione |
|---|---|
| **ROI** | `(Valore attuale - Totale investito) / Totale investito × 100` |
| **Rendimento netto** | `Valore attuale - Totale investito` (in €) |
| **Durata mesi** | Mesi dal primo acquisto a oggi |
| **CAGR** | Tasso di crescita annuo composto sul totale portafoglio |
| **TWRR** | Approssimato sui giorni di acquisto PAC (non NAV giornaliero) |
| **ATWRR** | Media geometrica annualizzata del TWRR |

Gli indicatori considerano solo gli ETF **non archiviati**.

### Persistenza & Backup
- **Supabase** come storage primario (sync automatico ad ogni mutazione)
- **Export JSON**: scarica tutti i dati in un file `.json`
- **Import JSON**: ripristina i dati da file (sovrascrive i dati su Supabase)

---

## Deploy su Vercel

```bash
npm run build
# Collegare il repository a Vercel
# Aggiungere le variabili d'ambiente nel pannello Vercel:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY
```
