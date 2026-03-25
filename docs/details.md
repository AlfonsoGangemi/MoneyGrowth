# Dettagli implementativi

## Autenticazione

### Flusso

L'app (`App.jsx`) gestisce tre percorsi distinti:

| Condizione | Vista mostrata |
|---|---|
| Caricamento sessione | Spinner |
| Non autenticato, prima visita (`pac_returning` assente) | `LandingPage` |
| Non autenticato, utente returning (`pac_returning=1`) | `AuthForm` (senza pulsante "indietro") |
| Non autenticato, ha cliccato CTA dalla landing | `AuthForm` (con pulsante "indietro") |
| Autenticato | `Dashboard` |

Al login riuscito, `App.jsx` imposta `localStorage.pac_returning = '1'` tramite `useEffect` su `user`.

### Flag `pac_returning`

- Chiave localStorage: `pac_returning`, valore: `'1'`
- Impostato automaticamente alla prima autenticazione
- Serve a inviare gli utenti returning direttamente al form di login invece della landing
- **"Torna alla home"**: link in fondo ad `AuthForm` (visibile solo per utenti returning); al click rimuove `pac_returning` e torna alla landing

### Componente `AuthForm.jsx`

Props:

| Prop | Descrizione |
|---|---|
| `onSignIn(email, pw)` | Login email/password |
| `onSignUp(email, pw)` | Registrazione |
| `onSignInGoogle()` | Login con Google OAuth |
| `onBack` | Se definita, mostra pulsante "← Torna alla home" in cima |
| `onTornaAllaLanding` | Se definita, mostra link "Torna alla home" in fondo (per utenti returning) |
| `defaultTab` | `'login'` \| `'register'` |

- Messaggi di errore inline (es. "Email o password errati", "Email già registrata")
- Blocca indirizzi email temporanei (via `utils/tempmail.js`)

### Hook `useAuth.js`
```js
// Espone:
{ user, loading, signIn, signUp, signOut, signInWithGoogle }
```
- Sottoscrive `supabase.auth.onAuthStateChange` per aggiornamenti in tempo reale
- `loading: true` durante il primo controllo di sessione (mostra spinner)
- `signInWithGoogle()` usa `supabase.auth.signInWithOAuth({ provider: 'google' })` con redirect a `window.location.origin`
- Integrazione Sentry: cattura le eccezioni auth e imposta `Sentry.setUser` al login/logout

---

## Persistenza

### Hook `usePortafoglio.js` — comportamento

- Al mount (con utente autenticato): carica da Supabase tutti gli ETF dell'utente con i relativi acquisti, scenari e broker
- Se al caricamento non esiste nessun broker, ne viene creato automaticamente uno chiamato **"Default"** (colore `#6366f1`)
- Ogni mutazione (aggiungiETF, aggiornaETF, aggiungiAcquisto, ecc.) scrive **prima** su Supabase, poi aggiorna lo stato locale
- In caso di errore Supabase → mostra un toast di errore; lo stato locale non viene aggiornato
- La config utente (orizzonte anni, mostra proiezione, `broker_filtro`) è sincronizzata sulla tabella `config` con upsert
- Export JSON rimane disponibile come backup manuale

### Gestione broker in `usePortafoglio.js`

Funzioni esposte:

| Funzione | Descrizione |
|---|---|
| `aggiungiBroker(nome, colore)` | INSERT in `broker`; aggiorna stato locale |
| `aggiornaBroker(id, campi)` | UPDATE parziale (es. `{ archiviato: true }`); aggiorna stato locale |
| `eliminaBroker(id)` | DELETE; fallisce silenziosamente se il broker ha acquisti (`ON DELETE RESTRICT`) |
| `setBrokerFiltro(uuids[])` | Aggiorna `brokerFiltro` nello stato e persiste su `config.broker_filtro` |

Stato globale aggiunto:
```js
{
  broker: [],       // array di tutti i broker dell'utente (attivi + archiviati)
  brokerFiltro: []  // UUID selezionati; array vuoto = tutti i broker aggregati
}
```

### Scenari di default

Alla prima registrazione, i tre scenari di default (Pessimistico, Moderato, Ottimistico) vengono inseriti in Supabase automaticamente (`signUp` → inserimento scenari di default).

---

## Internazionalizzazione (i18n)

### Hook `useLocale.jsx` / `LocaleProvider`

- Lingue supportate: **Italiano** (`it`) e **Inglese** (`en`)
- Preferenza persistita in `localStorage('lingua')`
- Default: `'it'`
- Espone `{ t, lingua, setLingua }` via context
- `t(key)` restituisce la stringa nella lingua corrente, con fallback su `it` se la chiave manca

### Dizionari

- `src/i18n/it.js` — stringhe italiane
- `src/i18n/en.js` — stringhe inglesi

### Toggle lingua

- Componente `LinguaToggle.jsx`: pulsante visibile nell'header della Dashboard e nella LandingPage
- Chiama `setLingua('it' | 'en')` da `useLocale()`

---
