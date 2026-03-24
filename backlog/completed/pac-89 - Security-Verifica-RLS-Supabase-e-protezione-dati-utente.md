---
id: PAC-89
title: Security - Verifica RLS Supabase e protezione dati utente
status: Done
assignee: []
created_date: '2026-03-23 15:02'
updated_date: '2026-03-23 15:26'
labels:
  - security
  - supabase
  - rls
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

Analizzando le chiamate di rete durante l'accesso al portafoglio, si osserva una richiesta del tipo:

```
GET https://hndfirsacytzchbfvttw.supabase.co/rest/v1/portafoglio_storico_annuale
  ?select=anno,broker_id,valore,totale_versato
  &user_id=eq.a31aa3f6-462d-49c9-a49d-a519eb7304f8
  &order=anno.asc
```

Il `user_id` è visibile nel query string. Un malintenzionato potrebbe tentare di sostituire il valore con l'UUID di un altro utente per accedere ai suoi dati.

## Obiettivo

Verificare che Row Level Security (RLS) sia correttamente configurato su Supabase per tutte le tabelle, così che anche se la chiamata venisse manipolata, il database restituisca solo i dati dell'utente autenticato — indipendentemente dal `user_id` passato nel filtro.

## Tabelle da verificare

- `portafoglio_storico_annuale`
- `etf_prezzi_storici`
- `portafoglio_etf` (o equivalente)
- `acquisti`
- `broker`
- Qualsiasi altra tabella che contiene dati per utente

## Verifiche da eseguire

1. **RLS abilitato** su ogni tabella (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
2. **Policy SELECT** che usa `auth.uid() = user_id` (non il filtro passato dal client)
3. **Policy INSERT/UPDATE/DELETE** analoghe
4. **Test pratico**: tentare una chiamata REST con un `user_id` diverso dall'utente autenticato e verificare che venga restituito un risultato vuoto (non un errore, ma zero righe)
5. **Verifica che la `anon key` non permetta di bypassare RLS** (la chiave pubblica usata nel client non deve avere privilegi `service_role`)

## Nota

La visibilità del `user_id` nell'URL non è di per sé una vulnerabilità se RLS è corretto — il database ignora il filtro del client e applica `auth.uid()`. Ma va confermato che sia effettivamente così.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 RLS è abilitato su tutte le tabelle con dati per utente
- [x] #2 Le policy SELECT usano auth.uid() e non il filtro client
- [x] #3 Test pratico confermato: chiamata con user_id altrui restituisce 0 righe
- [x] #4 La anon key non ha privilegi service_role
- [x] #5 Documentato l'esito della verifica
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Verifica completata con esito positivo. RLS abilitato su tutte le tabelle, policy SELECT usano auth.uid(), test pratico confermato (chiamata con user_id altrui restituisce 0 righe), anon key verificata con role: "anon".
<!-- SECTION:FINAL_SUMMARY:END -->
