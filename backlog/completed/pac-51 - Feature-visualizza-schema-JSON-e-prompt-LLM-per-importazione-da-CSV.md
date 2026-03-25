---
id: PAC-51
title: 'Feature: visualizza schema JSON e prompt LLM per importazione da CSV'
status: Done
assignee: []
created_date: '2026-03-13 20:00'
updated_date: '2026-03-25 11:27'
labels:
  - feature
  - ux
  - import
  - ai
dependencies:
  - PAC-91
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/Dashboard.jsx
  - spec/model.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Fornire all'utente un prompt pronto all'uso da passare a un LLM (es. ChatGPT, Claude) che contenga:
1. Lo schema JSON atteso dall'app per l'import
2. Le istruzioni per convertire un CSV con i propri dati nel formato corretto
3. Un'area dove incollare il risultato e importarlo direttamente

Questo semplifica l'onboarding per utenti che hanno i propri dati in formato CSV (es. export da broker, Excel, Google Sheets).

## Schema JSON atteso dall'import

```json
{
  "etf": [
    {
      "id": "uuid",
      "nome": "iShares Core MSCI World",
      "isin": "IE00B4L5Y983",
      "emittente": "BlackRock",
      "importoFisso": 100,
      "prezzoCorrente": 95.5,
      "archiviato": false,
      "broker": "Fineco"
    }
  ],
  "acquisti": [
    {
      "id": "uuid",
      "etfId": "uuid-dell-etf",
      "data": "2024-01-15",
      "quote": 1.047,
      "prezzoUnitario": 95.5,
      "importo": 100
    }
  ]
}
```

## Comportamento atteso

- Modale o sezione dedicata accessibile da un bottone "Importa da CSV con AI"
- Mostra il prompt precompilato con schema JSON + istruzioni per il LLM
- Bottone "Copia prompt" (clipboard)
- Area textarea per incollare il JSON generato dal LLM
- Bottone "Importa" che esegue il flusso `importJSON` esistente sul testo incollato
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 È presente un bottone/link 'Importa da CSV con AI' accessibile dalla dashboard
- [ ] #2 #2 Cliccando si apre un modale o una sezione con il prompt LLM precompilato
- [ ] #3 #3 Il prompt include lo schema JSON completo (etf + acquisti) con commenti esplicativi sui campi
- [ ] #4 #4 Il prompt include istruzioni per il LLM: 'dato questo CSV [...], genera un JSON nel formato seguente'
- [ ] #5 #5 È presente un bottone 'Copia prompt' che copia il testo negli appunti
- [ ] #6 #6 È presente una textarea dove incollare il JSON restituito dal LLM
- [ ] #7 #7 È presente un bottone 'Importa JSON' che avvia il flusso importJSON esistente
- [ ] #8 #8 Vengono mostrati gli eventuali errori di parsing o validazione del JSON incollato
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementata la funzionalità "Importa da CSV con AI" nella tab Importa di ImportExportModal.

**File modificati:**
- `src/components/CsvAiModal.jsx` (nuovo) — modale con prompt hardcodato IT/EN, copia negli appunti, textarea per incollare il JSON generato dal LLM, gestione errori/successo inline, focus trap + Escape
- `src/components/ImportExportModal.jsx` — aggiunto bottone "Importa da CSV con AI" nella tab Importa, stato interno `csvAiOpen`, rendering di `CsvAiModal` come sibling con Fragment
- `src/i18n/it.js` + `en.js` — aggiunte 9 chiavi `csv_ai_*`, aggiornata FAQ 7 per menzionare la nuova funzionalità
<!-- SECTION:FINAL_SUMMARY:END -->
