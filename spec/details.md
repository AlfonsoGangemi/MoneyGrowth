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
