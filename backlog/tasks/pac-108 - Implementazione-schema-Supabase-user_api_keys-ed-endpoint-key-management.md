---
id: PAC-108
title: 'Implementazione: schema Supabase user_api_keys ed endpoint key management'
status: Done
assignee: []
created_date: '2026-04-07 14:21'
updated_date: '2026-04-20 12:11'
labels:
  - backend
  - database
milestone: m-2
dependencies:
  - PAC-106
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Creazione della tabella Supabase e degli endpoint Vercel per la generazione e cancellazione delle API key.

## Decisione architetturale: hard delete

Le chiavi revocate vengono **eliminate fisicamente** (hard delete), non marcate con `revoked_at`. Motivazioni:
- Semplicità: tutte le righe in tabella = chiavi valide o scadute, nessun filtro aggiuntivo
- RLS `owner_delete` effettivamente utilizzata
- Nessun requisito di audit trail per questo use case
- La pulizia delle scadute avviene al momento della generazione (cleanup at generate)

## Cleanup at generate

Le chiavi scadute non vengono mai eliminate automaticamente (nessun job schedulato). Per mantenere la tabella pulita, **prima di ogni insert** si eliminano le chiavi scadute dell'utente:

```js
// Cleanup chiavi scadute prima dell'insert
await adminClient
  .from('user_api_keys')
  .delete()
  .eq('user_id', userId)
  .lt('expires_at', new Date().toISOString())
```

## Schema SQL

```sql
create table user_api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  key_hash     text not null unique,        -- sha256 hex; UNIQUE crea già l'indice implicito
  label        text,
  created_at   timestamptz default now(),
  last_used_at timestamptz,
  expires_at   timestamptz default now() + interval '90 days'
  -- nessun revoked_at: la cancellazione è fisica
  -- nessun indice aggiuntivo: UNIQUE su key_hash è sufficiente
);

-- Limite 2 chiavi attive per utente (trigger)
create or replace function check_api_key_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from user_api_keys
      where user_id = NEW.user_id
        and expires_at > now()) >= 2 then
    raise exception 'Limite massimo di 2 chiavi attive raggiunto';
  end if;
  return NEW;
end;
$$;
create trigger api_key_limit_check
  before insert on user_api_keys
  for each row execute function check_api_key_limit();

-- RLS: utente vede e cancella solo le proprie (usato dalla UI React via anon key)
alter table user_api_keys enable row level security;
create policy "owner_read" on user_api_keys
  for select using (auth.uid() = user_id);
create policy "owner_delete" on user_api_keys
  for delete using (auth.uid() = user_id);
```

## Endpoint `POST /api/keys/generate`

Input: JWT nell'header `Authorization: Bearer <jwt>`
Output: `{ id, label, key: "pac_<64hex>", expires_at }` — la `key` è mostrata una volta sola

Logica:
1. Estrae JWT dall'header
2. `supabase.auth.getUser(jwt)` → user_id
3. **Cleanup**: elimina chiavi scadute dell'utente (`expires_at < now()`)
4. Conta chiavi attive → se ≥ 2, risponde 409
5. `crypto.randomBytes(32).toString('hex')` → plain key
6. Prefix `pac_` → chiave finale 68 char
7. `crypto.createHash('sha256').update(plainKey).digest('hex')` → hash
8. Insert in `user_api_keys` (con service key per bypassare RLS sul write)
9. Risponde con `{ id, key: plainKey, expires_at }`

## Endpoint `DELETE /api/keys/:keyId`

Input: JWT nell'header, keyId nell'URL
Logica:
1. Verifica JWT → user_id
2. `DELETE FROM user_api_keys WHERE id = :keyId AND user_id = :userId` (hard delete fisico)
3. Se 0 righe eliminate → 404 (non trovata o non di proprietà dell'utente)
4. Risponde 204
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tabella user_api_keys creata senza campo revoked_at e senza indici aggiuntivi (UNIQUE su key_hash è sufficiente)
- [x] #2 POST /api/keys/generate esegue cleanup delle chiavi scadute prima dell'insert
- [x] #3 POST /api/keys/generate ritorna la chiave plain una sola volta (non è mai persistita in chiaro)
- [x] #4 DELETE /api/keys/:keyId esegue hard delete fisico con verifica ownership (nessun soft delete)
- [x] #5 Un utente non può avere più di 2 chiavi attive simultanee (rifiuto con 409)
- [x] #6 Nessuna chiave plain compare in log Vercel o Sentry
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Endpoint implementati in PAC-105/106: `api/keys/generate.js` (cleanup scadute, cap 2 chiavi, rate limit, insert con hash SHA256, chiave plain restituita una sola volta) e `api/keys/[keyId].js` (hard delete con ownership check). La chiave plain non viene mai loggata — nessun console.log, Vercel non logga i response body. Schema SQL (AC #1) già eseguito su Supabase nella sessione precedente.
<!-- SECTION:FINAL_SUMMARY:END -->
