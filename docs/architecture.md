# Architettura del Progetto

Descrizione dettagliata di ogni file del progetto. **Aggiornare ad ogni modifica architetturale.**

---

## `api/` — Funzioni serverless Vercel

| File | Responsabilità |
|---|---|
| `api/extraetf-quotes.js` | Proxy per le quotazioni ExtraETF: bypassa CORS del browser, restituisce i prezzi correnti degli ETF |
| `api/extraetf-detail.js` | Proxy per i dettagli ETF da ExtraETF (ISIN, nome, asset class) |
| `api/mcp.js` | MCP Streamable HTTP server (Vercel serverless). Espone tool e resource MCP per accesso LLM ai dati di portafoglio. Dual-auth: Bearer `pac_` API key + JWT OAuth 2.1 |
| `api/keys/generate.js` | `POST /api/keys/generate` — genera una Bearer API key `pac_<64hex>`, max 2 attive per utente, TTL 90gg |
| `api/keys/[keyId].js` | `DELETE /api/keys/:id` — revoca una API key per ID |
| `api/stats.js` | `GET /api/stats` — endpoint pubblico (no auth): statistiche aggregate anonime (acquisti, utenti, portafogli attivi, capitale gestito, stelle GitHub). Cache `public, max-age=3600, stale-while-revalidate=86400`. Graceful degradation per singola fonte. |

### `api/oauth/` — Authorization Server OAuth 2.1 + PKCE

| File | Responsabilità |
|---|---|
| `api/oauth/_lib.js` | Utility condivisa: `adminClient` Supabase, `sha256hex()`, `sha256raw()`, `base64url()`, `redirectUriMatches()` con supporto loopback RFC 8252 |
| `api/oauth/metadata.js` | `GET /.well-known/oauth-authorization-server` — discovery endpoint RFC 8414 |
| `api/oauth/protected-resource.js` | `GET /.well-known/oauth-protected-resource` — Protected Resource Metadata RFC 9728; indica `resource`, `authorization_servers` e `scopes_supported` |
| `api/oauth/authorize.js` | `POST /api/oauth/authorize` — validazione consenso + emissione authorization code PKCE. Token Supabase nel body JSON (`access_token`), nessun `Authorization` header |
| `api/oauth/token.js` | `POST /api/oauth/token` — scambio code→JWT access token (HMAC-SHA256, TTL 1h) + grant `refresh_token` con rotation |
| `api/oauth/register.js` | `POST /api/oauth/register` — dynamic client registration RFC 7591 |

---

## `src/components/` — Componenti React

| File | Responsabilità |
|---|---|
| `Dashboard.jsx` | Vista principale autenticata: layout generale, orchestrazione componenti, caricamento dati portafoglio |
| `ETFCard.jsx` | Card riepilogativa per singolo ETF: valore attuale, ROI, CAGR, acquisti |
| `AcquistoForm.jsx` | Form inserimento acquisto multi-ETF con selezione broker e data |
| `GraficoPortafoglio.jsx` | Grafico storico reale + proiezione scenari futuri (Recharts) |
| `TabellaProiezione.jsx` | Tabella scenari: proiezione per orizzonti temporali e rendimenti configurabili |
| `Indicatori.jsx` | Pannello indicatori finanziari: ROI, CAGR, TWRR, ATWRR, IRR, Drawdown, Volatilità |
| `ApiKeyPanel.jsx` | Modal gestione API key MCP: OAuth come flusso primario, Bearer key come fallback; snippet per Claude Code, Cursor, Codex CLI, Gemini CLI, Kiro |
| `OAuthConsent.jsx` | Pagina consenso OAuth 2.1: autenticazione Supabase + POST a `/api/oauth/authorize`; route SPA `/oauth/authorize` |
| `AuthForm.jsx` | Form login / registrazione con validazione email temporanee (`tempmail.js`) |
| `LandingPage.jsx` | Homepage pubblica v2: hero con DashboardMock, marquee broker, TrustStats, ProblemSection, HowItWorks, Testimonials, Pricing, FAQ a tab (Generale/Piattaforma/AI/Sicurezza), FinalCTA, StickyMobileCTA |
| `WatchlistPanel.jsx` | Pannello watchlist: form inserimento ISIN, tabella con prezzo corrente e link ExtraETF, rimozione ottimistica |
| `ImportExportModal.jsx` | Backup / Ripristino JSON del portafoglio |
| `CsvAiModal.jsx` | Import CSV storico acquisti tramite parsing LLM |
| `LinguaToggle.jsx` | Pulsante IT/EN in navbar |
| `ThemeToggle.jsx` | Pulsante tema chiaro/scuro in navbar |
| `Privacy.jsx` | Pagina informativa Privacy Policy |
| `Termini.jsx` | Pagina informativa Termini di Servizio |

---

## `src/hooks/` — Hook React

| File | Responsabilità |
|---|---|
| `usePortafoglio.js` | Stato globale portafoglio: CRUD ETF, acquisti, scenari, broker su Supabase; calcoli aggregati |
| `useAuth.js` | Sessione utente Supabase: login, logout, registrazione, stato autenticazione |
| `useApiKeys.js` | CRUD API key MCP: lista, generazione, revoca; chiama `api/keys/*` |
| `useLocale.jsx` | Context provider lingua + hook `useLocale()` con funzione `t(key)` e fallback IT |
| `useTheme.jsx` | Context provider tema chiaro/scuro con persistenza `localStorage` |
| `useETFQuotes.js` | Aggiornamento prezzi da ExtraETF: polling, debounce, aggiornamento Supabase |
| `useTrustStats.js` | Fetcha `GET /api/stats` al mount; restituisce `null` finché la risposta non è disponibile (nessun skeleton, no layout shift) |
| `useWatchlist.js` | Stato watchlist: CRUD ISIN su tabella `watchlist` Supabase, validazione regex + ExtraETF, prezzi real-time via `/api/extraetf-quotes` |

---

## `src/utils/` — Utility

| File | Responsabilità |
|---|---|
| `calcoli.js` | Tutti i calcoli finanziari: ROI, CAGR, TWRR, ATWRR, IRR, Drawdown, Volatilità, proiezioni, serie storiche. Esposto anche via MCP come resource e tool |
| `formatStat.js` | `formatStatValue(n)` — formatta un numero in notazione compatta con suffisso `+` (es. `1240 → "1K+"`, `3450000 → "3M+"`). Usato da TrustStats per visualizzare le statistiche pubbliche. |
| `backfillPrezzi.js` | `backfillETFPrices(isin, dateFrom, opts)` — storicizzazione demand-driven prezzi mensili ETF: legge gap da `etf_prezzi_storici`, chiama `/api/extraetf-quotes` history mode, upsert risultati; deduplicazione giornaliera via localStorage |
| `supabase.js` | Client Supabase singleton con anon key (lato client) |
| `tempmail.js` | Lista domini email temporanei bloccati in registrazione |

---

## `src/i18n/` — Internazionalizzazione

| File | Responsabilità |
|---|---|
| `it.js` | Dizionario italiano — lingua di default e fallback (namespace `auth_*`, `etf_*`, `mcp_*`, `ai_*`, `landing_*`, `faq_tab_*`, ecc.) |
| `en.js` | Dizionario inglese — stessa struttura chiave per chiave |
| `it.faq.js` | Domande e risposte FAQ in italiano (`faq_N_q` / `faq_N_a`, N = 1–12) — importato e mergiato in `it.js` |
| `en.faq.js` | Domande e risposte FAQ in inglese — importato e mergiato in `en.js` |

Convenzioni: namespace per sezione (`auth_*`, `mcp_*`, `etf_*`), nomi tecnici invariati (ISIN, ETF, MCP, OAuth). Dettagli in [CLAUDE.md](../CLAUDE.md#internazionalizzazione-i18n).

---

## `src/` — Entry point

| File | Responsabilità |
|---|---|
| `App.jsx` | Root: routing tra `AuthForm` e `Dashboard` in base alla sessione Supabase |
| `main.jsx` | Entry point Vite: monta `App` nel DOM, wrappa con provider globali |
| `entry-server.jsx` | Entry point SSR per prerendering statico (`scripts/prerender.mjs`) |
| `instrument.js` | Inizializzazione Sentry (error monitoring, opzionale) |
| `index.css` | Stili globali Tailwind + override custom |

---

## `scripts/` — Script di build / utility

| File | Responsabilità |
|---|---|
| `prerender.mjs` | Prerendering SSR delle pagine pubbliche (LandingPage, Privacy, Termini) per SEO |
| `check-secrets.mjs` | Lint pre-commit: rileva variabili d'ambiente esposte nel bundle client |
| `generate-og.mjs` | Generazione immagine Open Graph per social sharing |
| `png-to-svg.mjs` | Conversione asset PNG → SVG |

---

## File di configurazione radice (`pac-dashboard/`)

| File | Responsabilità |
|---|---|
| `vite.config.js` | Vite: plugin `api-dev` per routing serverless locale, proxy ExtraETF, build SSR |
| `vercel.json` | Routing Vercel: rewrite `/.well-known/oauth-authorization-server` → `api/oauth/metadata`, `/.well-known/oauth-protected-resource` → `api/oauth/protected-resource` |
| `eslint.config.js` | Regole ESLint per il progetto |
| `package.json` | Dipendenze e script npm |
| `index.html` | Shell HTML entry point |
