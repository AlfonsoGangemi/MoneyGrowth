# PAC Dashboard

## Obiettivo

Applicazione web per la gestione e visualizzazione dei rendimenti di un Piano di Accumulo Capitale (PAC) su più ETF, con proiezione futura per scenari personalizzabili. Supporta autenticazione multi-utente tramite Supabase, con dati persistiti su database cloud per utente.

---

## Stack Tecnologico

- **Framework**: React 19 + Vite 7
- **Styling**: Tailwind CSS 4
- **Grafici**: Recharts 3
- **Date**: date-fns 4
- **Autenticazione & DB**: Supabase (Auth + PostgreSQL)
- **Persistenza**: Supabase (cloud, per-utente) + Export/Import JSON
- **Deploy**: Vercel (serverless functions in `api/`)
- **MCP**: `@modelcontextprotocol/sdk` — layer AI su Vercel serverless
- **OAuth/JWT**: `jose` — firma e verifica JWT access token (HMAC-SHA256)
- **Error monitoring**: Sentry (`@sentry/react`, opzionale)
- **i18n**: sistema custom leggero (nessuna libreria esterna) — vedi `docs/i18n.md`
- **Test**: Vitest + `@vitest/coverage-v8`
- **Task Manager**: Backlog.md (via MCP)

---

## Struttura del Progetto

Leggi [`docs/architecture.md`](docs/architecture.md) per la struttura completa e la descrizione di ogni file.

> **Regola:** ogni volta che crei, sposti o elimini un file, aggiorna la tabella corrispondente in `docs/architecture.md`.

---

## Internazionalizzazione (i18n)

Leggi [`docs/i18n.md`](docs/i18n.md) per architettura, utilizzo e convenzioni delle chiavi.

---

## Documentazione di Riferimento

L'indice completo e aggiornato si trova in [`docs/README.md`](docs/README.md).

> **Regola:** ogni modifica architetturale (nuovi endpoint, cambio schema DB, nuove variabili d'ambiente, nuovi componenti o hook) deve essere riflessa nel documento pertinente in `docs/` **e** nell'indice `docs/README.md` prima di chiudere il task.

---

## Limiti Vercel piano free

No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan. Create a team (Pro plan) to deploy more.
Mantenere il limite dove possibile per rimanare nel limite del Piano gratuito di Vercel.


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
