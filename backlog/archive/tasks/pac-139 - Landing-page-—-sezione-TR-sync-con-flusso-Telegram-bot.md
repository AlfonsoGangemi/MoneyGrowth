---
id: PAC-139
title: Landing page — sezione TR sync con flusso Telegram bot
status: To Do
assignee: []
created_date: '2026-05-04 11:01'
updated_date: '2026-05-05 11:29'
labels:
  - landing
  - marketing
  - tr-sync
milestone: m-3
dependencies:
  - PAC-135
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiornare la sezione della landing page dedicata alla sincronizzazione Trade Republic per riflettere il nuovo flusso CSV → Telegram bot.

## Copy da aggiornare

**Titolo sezione**: "Importa le tue transazioni da Trade Republic"

**Flusso in 3 passi**:
1. 📥 Scarica il CSV da TR app → Impostazioni → Estratto conto
2. 📨 Invialo al bot Telegram @ETFLensBot
3. ✅ Le transazioni appaiono automaticamente nel tuo PAC

**Badge**: "Funzione PRO"

**CTA**: "Inizia il periodo di prova gratuito" → link signup

## Cosa rimuovere
- ~~"Sincronizzazione automatica giornaliera"~~
- ~~"Connetti il tuo account Trade Republic"~~
- ~~Qualsiasi riferimento a credenziali, PIN, o accesso diretto all'API TR~~
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sezione landing aggiornata con il flusso in 3 passi (CSV → bot → ETFLens)
- [ ] #2 Nessun riferimento a sync automatica o credenziali TR
- [ ] #3 Badge PRO visibile
- [ ] #4 CTA funzionante verso signup
- [ ] #5 Copy verificato su mobile e desktop
<!-- AC:END -->
