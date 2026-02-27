# PAC Dashboard

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

