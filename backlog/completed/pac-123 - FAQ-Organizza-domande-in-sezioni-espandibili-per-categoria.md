---
id: PAC-123
title: FAQ - Organizza domande in sezioni espandibili per categoria
status: Done
assignee: []
created_date: '2026-04-24 11:01'
updated_date: '2026-04-24 16:37'
labels:
  - ui
  - i18n
  - landing-page
  - faq
dependencies: []
references:
  - pac-dashboard/src/i18n/it.faq.js
  - docs/i18n.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le domande in `pac-dashboard/src/i18n/it.faq.js` contengono già il nome della sezione come prefisso tra parentesi quadre (es. `[Generale]`, `[Piattaforma]`, `[Integrazione AI]`, `[Sicurezza]`), ma vengono visualizzate come un elenco piatto disordinato.

## Obiettivo

Riscrivere il componente FAQ (landing page) per raggruppare le domande in **tab per sezione**: una barra orizzontale con le 4 categorie, click mostra solo le domande di quella sezione. Zero nesting, implementato con un singolo `useState`.

## Sezioni individuate in `it.faq.js`

| Sezione | Chiavi |
|---|---|
| Generale | faq_1…faq_4 |
| Piattaforma | faq_5…faq_8 |
| Integrazione AI | faq_9…faq_10 |
| Sicurezza | faq_11…faq_12 |

## Lavoro da svolgere

1. **i18n** — aggiungere chiavi di intestazione sezione (es. `faq_section_generale`, `faq_section_piattaforma`, …) e rimuovere il prefisso `[Sezione]` dal testo visibile delle domande (`faq_N_q`). Fare lo stesso per le altre lingue presenti (almeno `en`).
2. **Struttura dati** — nel componente FAQ, definire un array di sezioni, ciascuna con titolo i18n e lista di coppie domanda/risposta.
3. **Componente UI** — barra tab orizzontale con le 4 sezioni; la sezione attiva mostra le relative domande tutte visibili sotto (nessun accordion interno). Tab attivo evidenziato con stile distinto.
4. **Stile** — coerente con Tailwind CSS 4 e il design system esistente della landing page; verificare comportamento su mobile (tab scrollabili orizzontalmente se necessario).
5. **Test visivo** — verificare su desktop e mobile.

## Note

- Implementare con `useState` nativo, nessuna libreria aggiuntiva.
- Prima sezione attiva di default: `Generale`.
- Mantenere compatibilità con il sistema i18n custom del progetto (vedi `docs/i18n.md`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Le domande sono raggruppate per sezione tramite tab orizzontali (Generale, Piattaforma, Integrazione AI, Sicurezza)
- [x] #2 Click su un tab mostra solo le domande di quella sezione
- [x] #3 Il prefisso [Sezione] è rimosso dal testo visibile delle domande
- [x] #4 Le chiavi i18n delle intestazioni sezione sono presenti in tutti i file lingua (it, en)
- [x] #5 Il layout è responsive: tab scrollabili orizzontalmente su mobile se necessario
- [x] #6 Nessuna libreria aggiuntiva introdotta — solo useState
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato come parte del refactor Landing Page v2. Tab orizzontali (Generale, Piattaforma, Integrazione AI, Sicurezza) con `FAQ_TABS`/`FAQ_GROUPS` costanti e un singolo `useState('faq_tab_generale')`. Click su tab resetta l'accordion e filtra le domande del gruppo. Prefissi `[Sezione]` rimossi da tutte le 12 domande in `it.faq.js` e `en.faq.js`. Chiavi i18n dei tab (`faq_tab_generale`, `faq_tab_piattaforma`, `faq_tab_ai`, `faq_tab_sicurezza`) aggiunte a `it.js` e `en.js`. Tab scrollabili orizzontalmente su mobile via `overflow-x-auto`. Nessuna libreria aggiuntiva.
<!-- SECTION:FINAL_SUMMARY:END -->
