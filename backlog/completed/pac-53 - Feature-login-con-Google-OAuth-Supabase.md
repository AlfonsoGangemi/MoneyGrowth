---
id: PAC-53
title: 'Feature: login con Google OAuth (Supabase)'
status: Done
assignee: []
created_date: '2026-03-13 22:08'
updated_date: '2026-03-25 12:12'
labels:
  - auth
  - feature
  - ux
dependencies:
  - PAC-56
references:
  - pac-dashboard/src/components/AuthForm.jsx
  - pac-dashboard/src/hooks/useAuth.js
  - pac-dashboard/src/utils/supabase.js
documentation:
  - 'https://supabase.com/docs/guides/auth/social-login/auth-google'
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere il collegamento tramite account Google per velocizzare il login. L'email viene recuperata automaticamente da Google, eliminando la necessità di inserirla manualmente.

## Contesto
Supabase supporta nativamente Google OAuth. Basta abilitare il provider nel dashboard Supabase e aggiungere il pulsante nell'`AuthForm`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Nella schermata di login è presente un pulsante 'Continua con Google'
- [ ] #2 Cliccando il pulsante si apre il flusso OAuth Google (redirect o popup)
- [ ] #3 Al ritorno dall'autenticazione Google l'utente è loggato e vede la dashboard
- [ ] #4 L'email Google viene usata come identità utente in Supabase
- [ ] #5 Il flusso email+password esistente rimane invariato
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analisi codebase

### Architettura auth attuale
- `useAuth.js` — hook con `signIn`, `signUp`, `signOut` tramite `supabase.auth.*`. Il subscribe `onAuthStateChange` aggiorna `user` automaticamente al ritorno dal redirect OAuth.
- `App.jsx` — se `!user` renderizza `<AuthForm onSignIn={signIn} onSignUp={signUp} />`, altrimenti `<Dashboard>`.
- `AuthForm.jsx` — form email+password con tab Accedi/Registrati. Nessuna prop `onSignInGoogle` ancora presente.

### Flusso OAuth Google con Supabase
Supabase usa il flusso **redirect**: `signInWithOAuth({ provider: 'google' })` apre Google, al ritorno Supabase gestisce il token e `onAuthStateChange` fa scattare `setUser` → `App.jsx` renderizza la dashboard automaticamente. Non serve nessun callback manuale.

> ⚠️ Pre-requisito: completare **PAC-56** (configurazione manuale Supabase + Google Cloud Console) prima di procedere.

---

## Piano di implementazione

### Step 1 — `useAuth.js`: aggiungere `signInWithGoogle`
```js
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
}
```
Restituire `signInWithGoogle` nel return dell'hook.

### Step 2 — `App.jsx`: passare `onSignInGoogle` ad `AuthForm`
```jsx
const { user, loading, signIn, signUp, signOut, signInWithGoogle } = useAuth()
// ...
<AuthForm onSignIn={signIn} onSignUp={signUp} onSignInGoogle={signInWithGoogle} />
```

### Step 3 — `AuthForm.jsx`: aggiungere pulsante Google
- Nuova prop `onSignInGoogle`
- Aggiungere stato `loadingGoogle` separato da `loading`
- Inserire il pulsante **dopo** il form, separato da un divisore `— oppure —`, visibile su entrambi i tab (login e registrazione):
```jsx
<div className="mt-4">
  <div className="flex items-center gap-2 mb-4">
    <div className="flex-1 h-px bg-slate-700" />
    <span className="text-xs text-slate-500">oppure</span>
    <div className="flex-1 h-px bg-slate-700" />
  </div>
  <button
    type="button"
    onClick={handleGoogle}
    disabled={loadingGoogle}
    className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors border border-slate-600"
  >
    {/* SVG logo Google */}
    {loadingGoogle ? '…' : 'Continua con Google'}
  </button>
</div>
```
- `handleGoogle`: chiama `onSignInGoogle()`, gestisce errori con `setErrore(tradErrore(...))`

### Step 4 — Vercel: variabili d'ambiente
Nessuna variabile aggiuntiva richiesta — le credenziali Google sono salvate solo nel backend Supabase, non nel frontend.

---

## File modificati
| File | Modifica |
|---|---|
| `useAuth.js` | +`signInWithGoogle` |
| `App.jsx` | passa `onSignInGoogle` ad `AuthForm` |
| `AuthForm.jsx` | pulsante Google + stato `loadingGoogle` + gestione errori |
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato il login con Google OAuth tramite Supabase.

**File modificati:**
- `useAuth.js` — aggiunta funzione `signInWithGoogle` con `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`, con Sentry error tracking
- `App.jsx` — destructuring di `signInWithGoogle` e passaggio come prop `onSignInGoogle` ad `AuthForm`
- `AuthForm.jsx` — aggiunta prop `onSignInGoogle`, stato `loadingGoogle`, funzione `handleGoogle`, pulsante Google con logo SVG e divisore "oppure" (visibile solo se la prop è presente)
- `i18n/it.js` + `en.js` — aggiunte chiavi `auth_or` e `auth_google`

**Note:** Il pulsante è condizionale (`{onSignInGoogle && ...}`) — se la prop non viene passata non appare, garantendo retrocompatibilità. La configurazione Supabase + Google Cloud Console è delegata a PAC-56.
<!-- SECTION:FINAL_SUMMARY:END -->
