---
id: PAC-54
title: 'Feature: blocco registrazione con email temporanee (tempmail)'
status: Done
assignee: []
created_date: '2026-03-13 22:08'
updated_date: '2026-03-15 11:51'
labels:
  - auth
  - security
  - feature
milestone: m-0
dependencies: []
references:
  - pac-dashboard/src/components/AuthForm.jsx
  - pac-dashboard/src/hooks/useAuth.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Impedire la registrazione con indirizzi email usa-e-getta (tempmail) per mantenere la qualità degli utenti e ridurre abusi.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 La registrazione con domini tempmail noti viene rifiutata con messaggio di errore chiaro
- [ ] #2 La lista domini bloccati è mantenibile (file o costante dedicata)
- [ ] #3 Il login con email esistenti non è influenzato (solo la registrazione è bloccata)
- [ ] #4 Il controllo avviene lato frontend prima della chiamata a Supabase
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Approccio

Controllo lato frontend (AC-4): nessuna chiamata a Supabase, nessuna API esterna. Lista statica di domini mantenuta in un file dedicato (AC-2).

### 1. Nuovo file `src/utils/tempmail.js`

```js
const DOMINI_BLOCCATI = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.info',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.net',
  'guerrillamail.org', 'grr.la', 'sharklasers.com', 'spam4.me',
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'trashmail.com', 'trashmail.at', 'trashmail.io',
  'trashmail.me', 'trashmail.net', 'dispostable.com', 'fakeinbox.com',
  'mailnull.com', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  'tempmail.com', 'tempmail.net', 'tempmail.org', 'temp-mail.org',
  'throwam.com', 'throwam.net', 'mailtemp.net', 'getairmail.com',
  'filzmail.com', 'spamfree24.org', 'spamfree24.de', 'spamfree24.net',
  'spamfree24.info', 'spamfree24.biz', 'spamfree24.eu',
  'maildrop.cc', 'discard.email', 'spamhole.com', 'binkmail.com',
  'safetymail.info', 'mailmoat.com', 'spamavert.com',
  'mailnew.com', 'tempinbox.com', 'mailexpire.com',
])

export function isTempmail(email) {
  const dominio = email.split('@')[1]?.toLowerCase() ?? ''
  return DOMINI_BLOCCATI.has(dominio)
}
```

### 2. `AuthForm.jsx` — aggiunta in `handleSubmit`

Subito prima di `onSignUp` (riga 46), aggiungere:

```js
if (isTempmail(email)) {
  setErrore('Le email temporanee non sono accettate. Usa un indirizzo reale.')
  return
}
```

Importare `isTempmail` in cima al file:
```js
import { isTempmail } from '../utils/tempmail'
```

## File modificati
1. `pac-dashboard/src/utils/tempmail.js` — **nuovo**
2. `pac-dashboard/src/components/AuthForm.jsx` — import + 3 righe in handleSubmit

## Verifica
1. Tab "Registrati", email `test@mailinator.com` → errore "Le email temporanee non sono accettate."
2. Tab "Accedi", stessa email → nessun blocco (passa a Supabase normalmente)
3. Email reale → registrazione procede normalmente
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Creato `src/utils/tempmail.js` con Set di ~50 domini noti e funzione `isTempmail(email)`. In `AuthForm.jsx` aggiunto guard nel branch `register` di `handleSubmit` prima di `onSignUp`: se il dominio è nella lista, mostra errore senza chiamare Supabase. Login non toccato.
<!-- SECTION:FINAL_SUMMARY:END -->
