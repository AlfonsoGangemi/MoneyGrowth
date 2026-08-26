---
id: PAC-158
title: Endpoint MCP di sola lettura per utenti Free
status: Done
assignee: []
created_date: '2026-07-31 07:30'
updated_date: '2026-08-26 12:31'
labels: []
milestone: m-5
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Anche gli utenti FREE devono poter collegare client esterni (es. Claude Desktop) in sola lettura tramite MCP, come valore incluso nel piano gratuito. Va verificato che l'accesso resti effettivamente read-only e documentato per l'utente finale.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 È verificato/esposto un endpoint MCP di sola lettura accessibile agli utenti FREE
- [x] #2 L'endpoint non consente operazioni di scrittura o modifica dati
- [x] #3 Il collegamento è documentato in docs/ con istruzioni per l'utente finale (es. configurazione client MCP)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Verifica 2026-08-26: nessuna modifica al codice necessaria, il comportamento richiesto e' gia' in produzione.

api/mcp.js, api/keys/generate.js e ApiKeyPanel.jsx non fanno alcun check isPro/getUserPlan: qualunque utente autenticato (FREE o PRO) puo' generare una API key pac_ e collegare un client MCP.

Tutti i tool esposti in api/mcp.js sono get_* (get_portafoglio, get_etf, get_prezzi_storici, get_acquisti, get_storico, get_calcoli) e le resource sono read-only: non esiste alcun tool di scrittura/mutazione, quindi nessun rischio di operazioni di modifica dati.

docs/mcp.md (sezione Configurazione Claude Desktop, righe 502-541) documenta gia' setup OAuth/PKCE e API Key per l'utente finale; ApiKeyPanel.jsx genera inoltre snippet di configurazione in-app per Claude Code, Cursor, Codex CLI, Gemini CLI, Kiro e altri client.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
**Esito verifica**: nessuna modifica di codice necessaria — il comportamento richiesto da PAC-158 è già presente in produzione.

- **Accesso FREE**: `api/mcp.js`, `api/keys/generate.js` e `ApiKeyPanel.jsx` non applicano alcun gate `isPro`/`getUserPlan`. Qualsiasi utente autenticato, a prescindere dal piano, può generare una API key (`pac_...`) e collegare un client MCP esterno (OAuth/PKCE o Bearer key).
- **Sola lettura**: tutti i tool MCP sono `get_*` (nessuna scrittura/mutazione esiste nel server), quindi non c'è un endpoint di scrittura da bloccare.
- **Documentazione**: `docs/mcp.md` include già la sezione "Configurazione Claude Desktop" con istruzioni ed esempi JSON per l'utente finale (OAuth/PKCE e API Key); `ApiKeyPanel.jsx` copre inoltre altri client (Claude Code, Cursor, Codex CLI, Gemini CLI, Kiro).

Task chiusa come verifica, senza modifiche al codice.
<!-- SECTION:FINAL_SUMMARY:END -->
