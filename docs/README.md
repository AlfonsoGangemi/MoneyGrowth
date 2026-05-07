# Documentazione PAC Dashboard

Indice dei documenti tecnici del progetto. **Aggiornare questo file ad ogni modifica architetturale.**

| File | Contenuto |
|---|---|
| [architecture.md](architecture.md) | Descrizione dettagliata di ogni file del progetto (componenti, hook, api, utility, script) |
| [i18n.md](i18n.md) | Internazionalizzazione: architettura, utilizzo hook `useLocale`, convenzioni chiavi IT/EN |
| [function.md](function.md) | Funzionalità: gestione ETF, inserimento acquisti, grafico, scenari futuri, indicatori, persistenza |
| [model.md](model.md) | Modello dati: schema SQL Supabase (schemi `public` e `oauth`), RLS, variabili d'ambiente, struttura JSON frontend |
| [details.md](details.md) | Dettagli implementativi: flusso autenticazione, comportamento hook `usePortafoglio`, scenari di default |
| [deploy.md](deploy.md) | Deploy su Vercel: build, variabili d'ambiente richieste, rewrite `vercel.json` |
| [mcp.md](mcp.md) | Layer MCP: architettura, dual-auth (Bearer `pac_` + OAuth JWT), risorse e tool esposti, modello di sicurezza |
| [oauth-pkce-analysis.md](oauth-pkce-analysis.md) | Analisi OAuth 2.1 + PKCE: architettura AS, flusso PKCE, impatti, stima effort (PAC-117) |
| [mcp-auth-official-spec.md](mcp-auth-official-spec.md) | Requisiti ufficiali OAuth per MCP: spec MCP, requisiti Claude.ai, claim JWT, discovery, flusso completo, stato implementazione |
| [serverless-functions.md](serverless-functions.md) | Riferimento completo delle 12 Serverless Functions Vercel: endpoint, metodi HTTP, autenticazione, rate limit, request/response |
| [mcp-python-client.md](mcp-python-client.md) | Guida completa per implementare un client Python MCP indipendente: autenticazione API Key e OAuth 2.1 + PKCE, protocollo JSON-RPC, resources, tools, esempi |
