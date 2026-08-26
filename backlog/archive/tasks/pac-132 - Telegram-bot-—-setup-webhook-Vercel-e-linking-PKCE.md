---
id: PAC-132
title: 'Telegram bot — setup, webhook Vercel e linking PKCE'
status: To Do
assignee: []
created_date: '2026-05-02 14:10'
updated_date: '2026-05-07 13:13'
labels:
  - telegram
  - bot
  - pkce
  - auth
  - tr-sync
milestone: m-3
dependencies:
  - PAC-131
  - PAC-133
references:
  - 'https://github.com/cdamken/Trade_Republic_Connector'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementare un bot Telegram che riceve file CSV da Trade Republic e li invia all'endpoint `POST /api/import` di ETFLens (costruito in PAC-133/m-4), previa autenticazione tramite PKCE (riuso dell'infrastruttura OAuth già in uso per MCP).

## Schema aggiuntivo — `telegram_links` (gestito in questo task)
Collega un `chat_id` Telegram a un utente ETFLens tramite PKCE.

```sql
CREATE TABLE telegram_links (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id                 BIGINT NOT NULL UNIQUE,
  refresh_token_encrypted TEXT NOT NULL,
  settings                JSONB DEFAULT '{}',   -- import_from_date, include_dividends
  linked_at               TIMESTAMPTZ DEFAULT now(),
  last_used_at            TIMESTAMPTZ
);
CREATE INDEX ON telegram_links(user_id);
```

RLS: policy `auth.uid() = user_id`.

## Flusso linking (una tantum)
1. Utente invia `/start` al bot
2. Bot risponde con link PKCE: `https://etflens.app/auth/telegram?state=<chat_id_signed>`
3. Utente apre link, si autentica con Supabase, consenso
4. OAuth callback salva `refresh_token` + `chat_id` in `telegram_links`
5. Bot conferma: "✅ Account collegato. Ora puoi inviare il CSV di Trade Republic."

## Flusso import CSV
1. Utente invia il file `.csv` scaricato da TR app al bot
2. Bot esegue **silent refresh** del token
3. Bot chiama `GET /api/import/check` → verifica PRO
4. Se non PRO: "❌ Funzione disponibile solo per utenti PRO."
5. Se PRO: bot fa `POST /api/import` con il CSV parsato + Bearer token
6. Bot risponde: "✅ 12 acquisti importati, 3 già presenti."

## Silent refresh
Prima di ogni chiamata API il bot rinnova il token con `POST /api/oauth/token` (grant `refresh_token`). Se il refresh fallisce → bot invita a usare `/reconnect`.

## Comando /reconnect
Genera nuovo link PKCE, mantiene `telegram_links.settings`, sovrascrive solo `refresh_token_encrypted`.

## Variabili d'ambiente (da aggiungere a Vercel)
```
TELEGRAM_BOT_TOKEN=       # da BotFather
TELEGRAM_WEBHOOK_SECRET=  # per verificare le chiamate Telegram
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Bot Telegram creato su BotFather, token in variabile d'ambiente Vercel
- [ ] #2 Webhook endpoint `api/telegram-webhook.ts` deployato e registrato su Telegram
- [ ] #3 Comando `/start` genera link PKCE corretto con `state` firmato contenente `chat_id`
- [ ] #4 OAuth callback (`api/auth/telegram-callback.ts`) salva `refresh_token` + `chat_id` in `telegram_links`
- [ ] #5 Bot conferma collegamento all'utente dopo callback
- [ ] #6 Silent refresh eseguito automaticamente prima di ogni chiamata API; nuovo refresh_token persistito in `telegram_links`
- [ ] #7 Comando `/reconnect` genera nuovo link PKCE senza cancellare le impostazioni dell'utente
- [ ] #8 Bot risponde con errore PRO-gate friendly se `GET /api/import/check` ritorna `allowed: false`
- [ ] #9 Bot risponde con invito a /reconnect solo se il silent refresh fallisce (refresh_token scaduto/revocato)
- [ ] #10 Webhook verifica `X-Telegram-Bot-Api-Secret-Token` per sicurezza
- [ ] #11 Compatibile con Vercel Hobby (maxDuration 60s, conta come 1 serverless function)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
["1. Creare bot su BotFather, ottenere token", "2. Implementare `api/telegram-webhook.ts`: routing comandi (`/start`, `/reconnect`, file CSV)", "3. Implementare silent refresh: chiama Supabase /auth/v1/token con refresh_token, aggiorna telegram_links", "4. Implementare generazione link PKCE con state = HMAC(chat_id)", "5. Implementare `api/auth/telegram-callback.ts`: scambia code→token, salva in `telegram_links`", "6. Aggiungere chiamata pre-import a `GET /api/import/check` (PRO gate leggero)", "7. Registrare webhook su Telegram", "8. Test: silent refresh trasparente, /reconnect senza perdita settings, blocco utenti FREE"]
<!-- SECTION:PLAN:END -->
