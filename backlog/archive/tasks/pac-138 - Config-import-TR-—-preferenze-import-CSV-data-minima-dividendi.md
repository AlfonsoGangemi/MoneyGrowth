---
id: PAC-138
title: 'Config import TR — preferenze import CSV (data minima, dividendi)'
status: To Do
assignee: []
created_date: '2026-05-02 14:20'
updated_date: '2026-08-26 11:13'
labels:
  - ui
  - config
  - tr-sync
milestone: m-3
dependencies:
  - PAC-135
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Impostazioni per personalizzare il comportamento dell'import CSV di Trade Republic. Le impostazioni sono memorizzate nel campo `settings JSONB` della tabella `telegram_links`.

## Impostazioni disponibili

### `import_from_date` (date picker)
Ignora righe CSV con data antecedente a questa data. Utile per importare solo le transazioni dopo una certa data di inizio PAC.

### `include_dividends` (toggle)
Se attivo, importa anche le righe di tipo "dividendo" dal CSV TR (default: off).
I dividendi vengono salvati in `acquisti` con un flag dedicato o come riga separata con `importo_investito > 0` e `quote_frazionate = 0`.

## UI
- Form nella sezione "Impostazioni avanzate" della sezione Broker (PAC-135)
- Visibile solo se l'account Telegram è collegato
- Salvataggio: PATCH su `telegram_links.settings`

## Cosa NON implementare
- ~~Form numero di telefono TR~~
- ~~Campo PIN TR~~
- ~~Campo OTP/codice 2FA~~
- ~~Device ID / chiavi EC~~
- ~~Rinnovo sessione automatico~~
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Date picker `import_from_date` salva in `telegram_links.settings`
- [ ] #2 Toggle `include_dividends` salva in `telegram_links.settings`
- [ ] #3 Impostazioni caricate al mount dalla tabella `telegram_links`
- [ ] #4 Salvataggio con feedback visivo (spinner + conferma)
- [ ] #5 UI visibile solo se account Telegram è collegato
- [ ] #6 Nessun campo per credenziali TR (telefono, PIN, OTP)
<!-- AC:END -->
