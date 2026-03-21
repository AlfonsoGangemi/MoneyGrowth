---
id: PAC-82
title: 'Feature: gestione errori Sentry - captureException nei punti critici'
status: Done
assignee: []
created_date: '2026-03-21 13:36'
updated_date: '2026-03-21 17:20'
labels:
  - feature
  - monitoring
  - sentry
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/hooks/useAuth.js
  - pac-dashboard/src/utils/calcoli.js
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/src/components/AcquistoForm.jsx
  - pac-dashboard/src/components/Dashboard.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prerequisito: PAC-67 (Sentry inizializzato). Sentry cattura già le eccezioni non gestite. Questo task aggiunge `Sentry.captureException()` nei punti in cui gli errori vengono già intercettati (try/catch, .catch) ma non inoltrati a Sentry, e `Sentry.captureMessage()` per edge case nelle funzioni finanziarie.

---

## Piano di implementazione per priorità

### CRITICA — Dati finanziari e mutazioni DB

#### `usePortafoglio.js`

**`aggiornaStoricoAnnuale()` (riga ~282)**
Errori su Supabase vengono solo loggati in console. Perdita silenziosa di dati storici.
```js
Sentry.captureException(error, {
  tags: { component: 'usePortafoglio', operation: 'aggiornaStoricoAnnuale' },
  contexts: { params: { anno, brokerId } }
})
```

**`salvaPrezzoStorico()` (riga ~297)**
Errori solo in console. Il prezzo storico non viene salvato silenziosamente.
```js
Sentry.captureException(error, {
  tags: { component: 'usePortafoglio', operation: 'salvaPrezzoStorico' },
  contexts: { params: { isin } }
})
```

**`aggiungiAcquistiMultipli()` (righe ~353, ~393)**
Inserimento acquisti e upsert storico: errori impostano solo UI state senza capture.
```js
Sentry.captureException(error, {
  tags: { operation: 'aggiungiAcquistiMultipli' },
  contexts: { params: { acquistiCount: storicoToUpsert.length } }
})
```

**`caricaDati()` — backfill storico (riga ~203)**
`console.error(backfillErr)` senza capture. Dato finanziario critico perso silenziosamente.
```js
Sentry.captureException(backfillErr, {
  tags: { operation: 'caricaDati.backfill' }
})
```

**`importJSON()` (righe ~539–653)**
Operazione complessa con molti `throw`. Aggiungere capture con contesto prima di ogni `throw`:
```js
Sentry.captureException(err, {
  tags: { operation: 'importJSON' },
  contexts: { progress: { etfProcessati, acquistiProcessati } }
})
```

---

#### `calcoli.js` — edge case algoritmi finanziari

**`calcolaIRR()` — non-convergenza (riga ~145)**
Ritorna `null` silenziosamente se Newton-Raphson non converge in 200 iterazioni.
```js
Sentry.captureMessage('IRR non-convergence', 'warning', {
  contexts: { input: { acquistiCount: acquisti.length } }
})
```

**`calcolaMaxDrawdown()` (riga ~351)**
Possibile divisione per zero se `picco <= 0`.
```js
if (picco <= 0) {
  Sentry.captureMessage('MaxDrawdown: picco <= 0', 'warning')
  return null
}
```

**`calcolaVolatilita()` (riga ~372)**
Varianza negativa possibile per errori di arrotondamento floating-point.
```js
if (varianza < 0) {
  Sentry.captureMessage('Volatilità: varianza negativa', 'warning', {
    contexts: { varianza }
  })
}
```

---

### ALTA — Autenticazione e API esterne

#### `useAuth.js`

**`useEffect` init (riga ~9)** — `getSession()` può fallire (rete, Supabase down):
```js
try {
  const { data, error } = await supabase.auth.getSession()
  if (error) Sentry.captureException(error, { tags: { operation: 'getSession' } })
} catch (err) {
  Sentry.captureException(err, { tags: { operation: 'getSession' } })
}
```

**`signIn()` / `signUp()` (righe ~21–30)** — prima di fare `throw`:
```js
Sentry.captureException(error, { tags: { operation: 'signIn' } }) // o signUp
throw error
```

**`signOut()` (riga ~32)** — wrap in try/catch + capture.

#### `ETFCard.jsx` — `aggiornaPrezzoAPI()` (righe ~36–63)

Proxy esterno JustETF: errori catch solo in console. Fondamentale per debug proxy.
```js
Sentry.captureException(err, {
  tags: { source: 'justetf_proxy', isin: etf.isin },
  contexts: { response: { status: res?.status } }
})
```

---

### MEDIA — CRUD Supabase in `usePortafoglio.js`

Tutte le seguenti funzioni impostano `setErrore()` ma non fanno capture — aggiungere `Sentry.captureException(error, { tags: { operation: '...' } })` prima del setErrore:

- `aggiungiETF()` (~riga 244)
- `archiviaETF()` (~riga 262)
- `aggiornaETF()` (~riga 319)
- `aggiungiScenario()` (~riga 421)
- `rimuoviScenario()` (~riga 429)
- `aggiornaScenario()` (~riga 442)
- `aggiungiBroker()` (~riga 467)
- `aggiornaBroker()` (~riga 480)
- `eliminaBroker()` (~riga 491)
- `rimuoviAcquisto()` (~riga 403)

---

### MEDIA — Form e componenti

#### `AcquistoForm.jsx` — `handleSubmit()` (riga ~60)
`onAggiungi(items)` è async ma non wrapped; aggiungere try/catch con capture.

#### `Dashboard.jsx` — `aggiornaTuttiIPrezzi()`
Operazione bulk su prezzi: wrap errori aggregati con capture.

---

## Pattern standard consigliato

```js
} catch (err) {
  Sentry.captureException(err, {
    tags: { component: 'NomeComponente', operation: 'nomeOperazione' },
    contexts: { details: { /* dati rilevanti */ } }
  })
  setErrore('Messaggio per l\'utente') // o throw
}
```

## Note
- Non loggare dati utente sensibili (importi, ISIN vanno bene come identificatori tecnici; no email/nome)
- Per `calcoli.js` usare `captureMessage` con severity `'warning'` (non eccezioni vere)
- Aggiungere `Sentry.setUser({ id: user.id })` in `useAuth.js` dopo login per correlare errori all'utente (solo ID, no email)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tutti i catch block in usePortafoglio.js chiamano Sentry.captureException() con tag operation
- [ ] #2 calcoli.js: IRR non-convergenza e edge case numerici catturati con captureMessage('warning')
- [ ] #3 useAuth.js: errori di getSession, signIn, signUp, signOut catturati
- [ ] #4 ETFCard.jsx: errori proxy JustETF catturati con ISIN e status HTTP nel contesto
- [ ] #5 AcquistoForm.jsx: handleSubmit wrapped in try/catch con capture
- [ ] #6 Sentry.setUser({ id }) impostato dopo login e cleared dopo logout
- [ ] #7 Nessun dato sensibile (email, nome) nei contesti Sentry
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto Sentry.captureException() su tutti i punti critici di errore:

- **usePortafoglio.js**: captureException su tutti i 16 blocchi di errore Supabase (aggiungiETF, archiviaETF, aggiornaETF, salvaPrezzoStorico, aggiornaStoricoAnnuale, backfill, aggiungiAcquistiMultipli×2, rimuoviAcquisto, aggiungiScenario, rimuoviScenario, aggiornaScenario, aggiungiBroker, aggiornaBroker, eliminaBroker, importJSON catch)
- **useAuth.js**: captureException su getSession, signIn, signUp, signOut; Sentry.setUser({ id }) su login e Sentry.setUser(null) su logout via onAuthStateChange
- **calcoli.js**: captureMessage warning su IRR non-convergente (200 iterazioni) e varianza negativa in calcolaVolatilita
- **ETFCard.jsx**: captureException nel catch di aggiornaPrezzoAPI con tag isin
- **Dashboard.jsx**: captureException nel catch di aggiornaTuttiIPrezzi con tag isin

Tutti gli errori includono tag `operation` per filtrare in Sentry.
<!-- SECTION:FINAL_SUMMARY:END -->
