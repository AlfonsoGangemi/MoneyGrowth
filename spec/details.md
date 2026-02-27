# Dettagli implementativi

## Autenticazione

### Flusso
- All'avvio l'app controlla la sessione Supabase (`supabase.auth.getSession`)
- Se non autenticato → mostra `AuthForm` (login + registrazione con email/password)
- Se autenticato → mostra `Dashboard`
- Pulsante **Logout** in header, chiama `supabase.auth.signOut`
- La sessione è persistita automaticamente da Supabase (JWT in localStorage)

### Componente `AuthForm.jsx`
- Tab **Accedi** / **Registrati**
- Campi: email, password
- Messaggi di errore inline (es. "Email o password errati", "Email già registrata")
- Nessun flusso di recupero password nella V1 (può essere aggiunto in seguito)

### Hook `useAuth.js`
```js
// Espone:
{ user, session, loading, signIn, signUp, signOut }
```
- Sottoscrive `supabase.auth.onAuthStateChange` per aggiornamenti in tempo reale
- `loading: true` durante il primo controllo di sessione (mostra spinner)

---

## Persistenza

### Hook `usePortafoglio.js` — comportamento

- Al mount (con utente autenticato): carica da Supabase tutti gli ETF dell'utente con i relativi acquisti e scenari
- Ogni mutazione (aggiungiETF, aggiornaETF, aggiungiAcquisto, ecc.) scrive **prima** su Supabase, poi aggiorna lo stato locale
- In caso di errore Supabase → mostra un toast di errore; lo stato locale non viene aggiornato
- La config utente (orizzonte anni, mostra proiezione) è sincronizzata sulla tabella `config` con upsert
- Export JSON rimane disponibile come backup manuale

### Scenari di default

Alla prima registrazione, i tre scenari di default (Pessimistico, Moderato, Ottimistico) vengono inseriti in Supabase automaticamente (`signUp` → inserimento scenari di default).

---
