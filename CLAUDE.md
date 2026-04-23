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
├── api/
│   ├── extraetf-quotes.js         # Proxy ExtraETF quotazioni
│   ├── extraetf-detail.js         # Proxy ExtraETF dettaglio ETF
│   ├── mcp.js                     # MCP Streamable HTTP server (Vercel serverless)
│   └── keys/
│       ├── generate.js            # POST /api/keys/generate — genera API key
│       └── [keyId].js             # DELETE /api/keys/:id — revoca API key
├── public/
└── src/
    ├── components/
    │   ├── Dashboard.jsx          # Vista principale, layout generale
    │   ├── ETFCard.jsx            # Card riepilogativa per ogni ETF
    │   ├── AcquistoForm.jsx       # Form inserimento acquisto multi-ETF
    │   ├── GraficoPortafoglio.jsx # Grafico storico reale + proiezione scenari
    │   ├── TabellaProiezione.jsx  # Tabella scenari futuri
    │   ├── Indicatori.jsx         # ROI, CAGR, TWRR, ecc.
    │   ├── ApiKeyPanel.jsx        # Modal gestione API key MCP
    │   ├── AuthForm.jsx           # Login / Registrazione
    │   ├── LandingPage.jsx        # Homepage pubblica
    │   ├── ImportExportModal.jsx  # Backup / Ripristino JSON
    │   ├── CsvAiModal.jsx         # Import CSV via LLM
    │   ├── LinguaToggle.jsx       # Selettore lingua IT/EN
    │   └── ThemeToggle.jsx        # Selettore tema chiaro/scuro
    ├── hooks/
    │   ├── usePortafoglio.js      # Stato globale + CRUD Supabase
    │   ├── useAuth.js             # Sessione utente Supabase
    │   ├── useApiKeys.js          # CRUD API key MCP
    │   ├── useLocale.jsx          # Contesto lingua + funzione t()
    │   ├── useTheme.jsx           # Contesto tema
    │   └── useETFQuotes.js        # Aggiornamento prezzi da ExtraETF
    ├── i18n/
    │   ├── it.js                  # Dizionario italiano (lingua di default)
    │   └── en.js                  # Dizionario inglese
    ├── utils/
    │   ├── calcoli.js             # Tutti i calcoli finanziari
    │   ├── supabase.js            # Client Supabase singleton (anon key)
    │   └── tempmail.js            # Blocco email temporanee in registrazione
    ├── App.jsx                    # Root: routing auth ↔ dashboard
    └── main.jsx
├── index.html
├── vite.config.js                 # Vite + plugin api-dev per sviluppo locale
└── package.json
```

---

## Internazionalizzazione (i18n)

L'app supporta italiano e inglese tramite un sistema custom leggero, senza librerie esterne.

### Architettura

| File | Ruolo |
|---|---|
| [`src/i18n/it.js`](pac-dashboard/src/i18n/it.js) | Dizionario IT — lingua di default |
| [`src/i18n/en.js`](pac-dashboard/src/i18n/en.js) | Dizionario EN — stessa struttura chiave per chiave |
| [`src/hooks/useLocale.jsx`](pac-dashboard/src/hooks/useLocale.jsx) | Context provider + hook `useLocale()` |
| [`src/components/LinguaToggle.jsx`](pac-dashboard/src/components/LinguaToggle.jsx) | Pulsante IT/EN in navbar |

### Utilizzo nei componenti

```jsx
import { useLocale } from '../hooks/useLocale'

function MyComponent() {
  const { t } = useLocale()
  return <p>{t('chiave_dizionario')}</p>
}
```

La funzione `t(key)` cerca prima nel dizionario della lingua corrente, poi in `it` come fallback, poi ritorna la chiave grezza se non trovata.

### Convenzioni per le chiavi

- **Namespace per sezione** con prefisso: `auth_*`, `mcp_*`, `etf_*`, `broker_*`, ecc.
- Le chiavi sono in italiano descrittivo (`mcp_revoke_confirm`, non `mcp_rc`)
- Ogni nuova stringa UI **deve** avere la chiave in entrambi i file (`it.js` e `en.js`)
- I nomi tecnici non traducibili (ISIN, ETF, MCP, OAuth, Bearer) restano invariati in entrambe le lingue
- La lingua è persistita in `localStorage` con chiave `'lingua'`

---

## Documentazione di Riferimento

La cartella [`docs/`](docs/) contiene le specifiche dettagliate del progetto:

| File | Contenuto |
|---|---|
| [`docs/function.md`](docs/function.md) | Funzionalità: gestione ETF, inserimento acquisti, grafico, scenari futuri, indicatori, persistenza |
| [`docs/model.md`](docs/model.md) | Modello dati: schema SQL Supabase, RLS, variabili d'ambiente, struttura JSON frontend |
| [`docs/details.md`](docs/details.md) | Dettagli implementativi: flusso autenticazione, comportamento hook `usePortafoglio`, scenari di default |
| [`docs/deploy.md`](docs/deploy.md) | Deploy su Vercel: build e variabili d'ambiente richieste |
| [`docs/mcp.md`](docs/mcp.md) | Layer MCP: architettura, autenticazione API key, risorse e tool esposti, modello di sicurezza |

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
