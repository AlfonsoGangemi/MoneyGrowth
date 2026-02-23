# PAC Dashboard

Applicazione web per la gestione e visualizzazione di un Piano di Accumulo Capitale (PAC) su più ETF, con autenticazione multi-utente e dati persistiti su Supabase.

---

## Stack

- **React + Vite** — SPA
- **Tailwind CSS** — styling
- **Recharts** — grafici
- **Supabase** — autenticazione (email/password) + database PostgreSQL
- **Vercel** — deploy

---

## Setup locale

### 1. Installa le dipendenze

```bash
cd pac-dashboard
npm install
```

### 2. Configura Supabase

1. Vai su [supabase.com](https://supabase.com) e crea un nuovo progetto
2. Nella sezione **SQL Editor**, esegui lo schema riportato in [`spec.md`](../spec.md#database-supabase) (tabelle `etf`, `acquisti`, `scenari`, `config`) e le policy RLS
3. Copia **Project URL** e **anon public key** dalla sezione **Project Settings → API**

### 3. Crea il file `.env`

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### 4. Avvia in sviluppo

```bash
npm run dev
```

---

## Struttura del Progetto

```
src/
├── components/
│   ├── AuthForm.jsx           # Login / Registrazione
│   ├── Dashboard.jsx          # Vista principale
│   ├── ETFCard.jsx            # Card per ogni ETF
│   ├── AcquistoForm.jsx       # Form acquisto multi-ETF
│   ├── GraficoPortafoglio.jsx # Grafico storico + proiezioni
│   └── Indicatori.jsx         # ROI, CAGR, TWRR, ecc.
├── hooks/
│   ├── useAuth.js             # Sessione utente Supabase
│   └── usePortafoglio.js      # Stato globale + CRUD Supabase
├── utils/
│   ├── calcoli.js             # Calcoli finanziari
│   └── supabase.js            # Client Supabase singleton
└── App.jsx                    # Routing auth ↔ dashboard
```

---

## Deploy su Vercel

1. Collega il repository a Vercel
2. Nella sezione **Environment Variables** del progetto Vercel, aggiungi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Vercel rileva automaticamente Vite e usa `npm run build` + `dist/` come output

---

## Schema Database

Vedere [`spec.md`](../spec.md) per lo schema SQL completo e le policy RLS.

Le tabelle principali sono:

| Tabella   | Contenuto |
|-----------|-----------|
| `etf`     | ETF configurati per utente |
| `acquisti`| Storico acquisti PAC |
| `scenari` | Scenari di proiezione personalizzati |
| `config`  | Preferenze utente (orizzonte, proiezione) |

Ogni tabella ha **Row Level Security** abilitata: ogni utente accede esclusivamente ai propri dati.

---

## Variabili d'ambiente

| Variabile              | Descrizione |
|------------------------|-------------|
| `VITE_SUPABASE_URL`    | URL del progetto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chiave pubblica anonima Supabase |
