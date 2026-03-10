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
- **Task Manager**: Backlog.md (via MCP)

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

## Documentazione di Riferimento

La cartella [`spec/`](spec/) contiene le specifiche dettagliate del progetto:

| File | Contenuto |
|---|---|
| [`spec/function.md`](spec/function.md) | Funzionalità: gestione ETF, inserimento acquisti, grafico, scenari futuri, indicatori, persistenza |
| [`spec/model.md`](spec/model.md) | Modello dati: schema SQL Supabase, RLS, variabili d'ambiente, struttura JSON frontend |
| [`spec/details.md`](spec/details.md) | Dettagli implementativi: flusso autenticazione, comportamento hook `usePortafoglio`, scenari di default |
| [`spec/deploy.md`](spec/deploy.md) | Deploy su Vercel: build e variabili d'ambiente richieste |

---


<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and finalization
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->
