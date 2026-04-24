---
id: PAC-115
title: 'UI: sezione landing page per le funzionalità MCP'
status: Done
assignee: []
created_date: '2026-04-20 12:00'
updated_date: '2026-04-24 08:49'
labels:
  - frontend
  - marketing
milestone: m-2
dependencies:
  - PAC-120
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere una sezione nella landing page che comunichi le funzionalità MCP agli utenti: cosa si può fare, come si attiva, perché è utile.

## Contenuto da comunicare

- **Cosa è**: connetti il tuo portafoglio a Claude (o qualsiasi LLM compatibile MCP) e fai domande in linguaggio naturale
- **Esempi di domande**: "Qual è il mio CAGR negli ultimi 3 anni?", "Quale ETF ha performato meglio?", "Quanto ho versato in totale per broker?"
- **Come si attiva**: genera una API key dal pannello impostazioni, configura il client MCP con l'endpoint
- **Privacy**: i dati non escono da Supabase — il server MCP legge solo i dati dell'utente autenticato

## Tono e stile

Coerente con il resto della landing: concreto, orientato al valore, nessun gergo tecnico (evitare "Model Context Protocol", preferire "connetti il tuo portafoglio a Claude").
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La sezione è visibile nella landing page sopra il fold o comunque raggiungibile senza scroll eccessivo
- [x] #2 Almeno 3 esempi di domande in linguaggio naturale che l'utente può fare a Claude
- [x] #3 CTA che rimanda alla generazione della API key (link al pannello impostazioni)
- [x] #4 Nessun riferimento a 'MCP' o 'Model Context Protocol' nel testo visibile all'utente finale
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunta sezione AI alla landing page tra le feature card e la FAQ. Layout a due colonne (testo + chat bubbles), badge "Claude · Assistente AI", 2 step numerati, nota privacy con lucchetto, CTA → onCTA('register'). 4 domande di esempio come bubble blu. 12 chiavi i18n aggiunte in it.js e en.js. Nessun riferimento a "MCP" o "Model Context Protocol" visibile all'utente finale. Build verificata: 0 errori.
<!-- SECTION:FINAL_SUMMARY:END -->
