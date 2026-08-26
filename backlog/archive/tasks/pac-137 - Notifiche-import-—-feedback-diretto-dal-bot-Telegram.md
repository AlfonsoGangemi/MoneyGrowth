---
id: PAC-137
title: Notifiche import — feedback diretto dal bot Telegram
status: To Do
assignee: []
created_date: '2026-05-02 14:20'
updated_date: '2026-08-26 11:13'
labels:
  - ux
  - telegram
  - notifiche
  - tr-sync
milestone: m-3
dependencies:
  - PAC-133
  - PAC-135
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il bot Telegram è il canale primario di notifica per gli import CSV. L'app mostra solo informazioni passive sull'ultimo import.

## Flusso notifica (lato bot)
Dopo ogni import, il bot risponde direttamente nella chat Telegram:
- Successo: `✅ Import completato: 12 acquisti inseriti, 3 già presenti (15 totali).`
- Errore CSV: `❌ File non riconosciuto. Assicurati di inviare il CSV esportato da Trade Republic app → Impostazioni → Estratto conto.`
- Errore auth: `❌ Sessione scaduta. Usa /start per ricollegare l'account.`

## Lato app (passivo)
- Nella sezione Broker (PAC-135): "Ultimo import: 12 righe il 15/03/2024"
- Dati letti da `broker_sync_log`

## Cosa NON implementare
- ~~Badge on-mount dopo sync automatico~~
- ~~Toast di notifica in-app dopo import~~
- ~~Polling dello stato sync~~
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bot risponde con messaggio di successo contenente conteggi inseriti/saltati/totali
- [ ] #2 Bot risponde con messaggio di errore friendly per CSV non riconosciuto
- [ ] #3 Bot risponde con messaggio di errore e link /start se il token è scaduto
- [ ] #4 App mostra data e conteggio ultimo import nella sezione Broker (da broker_sync_log)
- [ ] #5 Nessun badge on-mount o polling in-app
- [ ] #6 Il bot passa `sync_source: 'telegram_bot'` e `broker: { nome: 'Trade Republic', colore: '#6366f1' }` (oggetto singolo) nel body di ogni chiamata POST /api/import
<!-- AC:END -->
