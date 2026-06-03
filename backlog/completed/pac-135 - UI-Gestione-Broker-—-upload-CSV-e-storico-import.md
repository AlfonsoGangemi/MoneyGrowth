---
id: PAC-135
title: UI Gestione Broker — upload CSV e storico import
status: Done
assignee: []
created_date: '2026-05-02 14:10'
updated_date: '2026-05-08 14:58'
labels:
  - ui
  - pro
  - telegram
  - tr-sync
milestone: m-4
dependencies:
  - PAC-133
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sezione "Broker" nell'app ETFLens che consente agli utenti PRO di caricare CSV da broker e visualizzare lo storico degli import. Accessibile solo agli utenti PRO.

## Prerequisito
Il broker deve essere già creato dall'utente tramite la UI (gestione broker esistente). L'import non crea broker inline: il payload invia `broker_id` (UUID del broker selezionato).

## Selezione broker
- Dropdown o lista dei broker esistenti dell'utente (da `broker` table)
- L'utente seleziona il broker prima di caricare il file

## Upload CSV
- Drag & drop o file picker per selezionare il CSV scaricato da Trade Republic (o futuri broker)
- Il client legge e parsa il CSV in JS → converte nel formato backup → invia a `POST /api/import`
- Payload: `{ broker_id: "<uuid>", sync_source: "ui_upload", etf: [...] }` — ogni acquisto include `broker_transaction_id` (se presente nel CSV)
- Feedback immediato: spinner durante upload, poi riepilogo `{ inserted, skipped, total }`
- Messaggio di errore chiaro se il file non è un CSV TR riconoscibile

## Dedup e overwrite
- Transazioni con `broker_transaction_id` → dedup su `(broker_id, broker_transaction_id)`
- Se esiste una riga manuale senza `broker_transaction_id` con stessa `(broker_id, etf_id, data, importo_investito)` → arricchita con il `broker_transaction_id` (non duplicata)
- Transazioni senza `broker_transaction_id` → dedup fallback su `(broker_id, etf_id, data, importo_investito)`

## Storico import
- Lista degli ultimi import da `broker_sync_log`: data, broker, canale (`ui_upload` / `telegram_bot`), righe inserite/saltate
- Nessun polling: caricato una volta al mount

## Gate PRO
- Utenti FREE: mostra CTA "Funzione disponibile per utenti PRO" con upgrade link
- Nessuna sezione broker visibile nel menu per utenti FREE

## Slot per estensione m-3
- Se account Telegram collegato (dato disponibile tramite query `telegram_links`): mostra sezione aggiuntiva con stato collegamento — questo contenuto viene aggiunto da PAC-132/m-3, non implementato in questo task

## Cosa NON implementare in questo task
- Form telefono/PIN TR
- OTP/2FA inline
- Trigger sync automatico
- UI stato collegamento Telegram (si aggiunge in m-3)
- Creazione broker inline durante l'import
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Gate PRO: utenti FREE vedono CTA upgrade, non la sezione broker
- [ ] #2 Selezione broker: dropdown/lista dei broker esistenti dell'utente; impossibile avviare import senza broker selezionato
- [ ] #3 Drag & drop / file picker accetta CSV Trade Republic
- [ ] #4 Parsing CSV in JS: filtra righe TRADING BUY/SELL, costruisce payload con `broker_id` (UUID del broker selezionato) e array `etf[]` — ogni acquisto include `broker_transaction_id` se disponibile nel CSV
- [ ] #5 Feedback upload: spinner durante invio, poi riepilogo `{ inserted, skipped, total }`
- [ ] #6 Messaggio di errore chiaro se il file non è riconosciuto come CSV TR
- [ ] #7 Storico import: lista da `broker_sync_log` con data, broker, canale, righe inserite/saltate
- [ ] #8 Responsive: funziona su mobile e desktop
- [ ] #9 Nessun form per credenziali TR (telefono, PIN, OTP)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
["1. Componente `BrokerPanel.tsx` con gate PRO", "2. Dropdown selezione broker esistente (query `broker` table)", "3. Hook `useBrokerImport()`: parsing CSV client-side + POST /api/import + lettura broker_sync_log", "4. Parsing CSV TR: estrae ISIN, nome ETF, data, importo, prezzo, fee, broker_transaction_id", "5. Componente drop zone / file picker con feedback visivo (spinner + riepilogo)", "6. Lista storico import da broker_sync_log (con colonna broker)", "7. Slot vuoto per futura sezione Telegram (PAC-132, m-3)"]
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato pannello import CSV broker (PRO) integrato nella modale "Gestione broker". Ogni riga broker ha un bottone "Importa dati" che apre il pannello inline nella stessa modale. Gate PRO gestito da BrokerImportPanel con messaggio blu per utenti non PRO. Fix registrazione route /api/import nel plugin dev Vite. Messaggi di errore migliorati con dettaglio dal server.
<!-- SECTION:FINAL_SUMMARY:END -->
