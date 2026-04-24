---
id: PAC-110
title: 'Implementazione: UI React pannello gestione API key MCP'
status: Done
assignee: []
created_date: '2026-04-07 14:22'
updated_date: '2026-04-21 05:08'
labels:
  - frontend
milestone: m-2
dependencies:
  - PAC-108
  - PAC-109
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Componente React nell'app per generare, visualizzare e revocare le API key MCP. L'obiettivo è minimalismo: nessuna nuova pagina, integrata nella dashboard esistente (es. modal o sezione collassabile nelle impostazioni).

## UX flow

1. **Nessuna chiave attiva**: pulsante "Genera chiave MCP" + breve spiegazione a cosa serve
2. **Generazione**: chiama `POST /api/keys/generate` passando il JWT (`supabase.auth.getSession()` → `session.access_token`). La chiave plain viene mostrata in un box con copia-in-clipboard. Warning esplicito: "Questa chiave verrà mostrata una sola volta. Salvala ora."
3. **Lista chiavi attive**: per ogni chiave mostra `label` (o `id` troncato), `created_at`, `last_used_at` (o "Mai usata"), `expires_at`, pulsante "Revoca"
4. **Revoca**: conferma con dialog, poi `DELETE /api/keys/:id` — cancellazione fisica, irreversibile

## Dati dalla UI

La lista chiavi usa il client Supabase anon (RLS attivo) direttamente. Nessun `revoked_at` — le chiavi cancellate non esistono più in tabella, quindi il filtro è solo su `expires_at`:

```js
const { data } = await supabase
  .from('user_api_keys')
  .select('id, label, created_at, last_used_at, expires_at')
  .gt('expires_at', new Date().toISOString())
  .order('created_at', { ascending: false })
```

I due endpoint `/api/keys/generate` e `/api/keys/:id` (DELETE) usano il JWT per auth.

## Componente suggerito

`src/components/ApiKeyPanel.jsx` — montato nella Dashboard o in un modal impostazioni, visibile solo agli utenti autenticati. Dimensione stimata: ~120 righe.

## Istruzioni configurazione per l'utente

Dopo la generazione, mostrare snippet di configurazione pronto per Claude Desktop:
```json
{
  "mcpServers": {
    "etflens": {
      "url": "https://etflens.app/api/mcp",
      "headers": {
        "Authorization": "Bearer pac_<la-tua-chiave>"
      }
    }
  }
}
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il pannello mostra la lista delle chiavi non scadute con created_at, last_used_at, expires_at (query filtrata su expires_at > now(), nessun revoked_at)
- [x] #2 La chiave plain viene mostrata una sola volta al momento della generazione con warning visibile e copia-clipboard
- [x] #3 La revoca esegue hard delete fisico, richiede conferma esplicita e aggiorna la lista in tempo reale
- [x] #4 Viene mostrato lo snippet di configurazione per Claude Desktop con la chiave appena generata
- [x] #5 Il pannello non è visibile se l'utente non è autenticato
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Obiettivo

Creare `src/components/ApiKeyPanel.jsx` e integrarlo in Dashboard come modal, accessibile dal menu dropdown (voce "Chiavi MCP"). Nessuna nuova pagina.

---

## Step 1 — Hook `useApiKeys`

Creare `src/hooks/useApiKeys.js` che gestisce tutta la logica async:

```js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState(null)   // plain key mostrata una sola volta
  const [error, setError] = useState(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_api_keys')
      .select('id, created_at, last_used_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setKeys(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function generate() {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json()
    if (!res.ok) { setError(body.error); return }
    setNewKey(body.key)
    await fetchKeys()
  }

  async function revoke(keyId) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/keys/${keyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { const b = await res.json(); setError(b.error); return }
    setKeys(k => k.filter(x => x.id !== keyId))
  }

  function clearNewKey() { setNewKey(null) }

  return { keys, loading, newKey, error, generate, revoke, clearNewKey }
}
```

---

## Step 2 — Componente `ApiKeyPanel.jsx`

`src/components/ApiKeyPanel.jsx` — montato come Modal esistente (riutilizza il componente `Modal` da Dashboard).

**Struttura UI:**

1. **Header**: titolo "Chiavi API MCP" + sottotitolo esplicativo (accesso da Claude Desktop).

2. **Banner chiave appena generata** (visibile solo se `newKey != null`):
   - Box con la chiave in `<code>`, pulsante copia clipboard, warning "Questa chiave viene mostrata una sola volta. Salvala ora."
   - Pulsante "Ho salvato la chiave" → chiama `clearNewKey()`

3. **Snippet configurazione Claude Desktop** (mostrato solo assieme al banner):
   ```json
   {
     "mcpServers": {
       "etflens": {
         "url": "https://etflens.app/api/mcp",
         "headers": { "Authorization": "Bearer <chiave>" }
       }
     }
   }
   ```

4. **Lista chiavi attive**: tabella/lista con per ogni chiave:
   - ID troncato (prime 8 char), `created_at` formattato, `last_used_at` (o "Mai usata"), `expires_at`
   - Pulsante "Revoca" → `window.confirm()` poi `revoke(id)`

5. **Footer**: pulsante "Genera nuova chiave" (disabilitato se `keys.length >= 2`), messaggio di errore se `error != null`.

**Formato date**: usare `date-fns/format` già presente nel progetto, pattern `dd/MM/yyyy`.

---

## Step 3 — Integrazione in Dashboard

In `Dashboard.jsx`:

1. Import `ApiKeyPanel`
2. Aggiungere `useState` per `modalApiKey`
3. Nel menu dropdown (voce dopo "Crediti"), aggiungere:
   ```jsx
   <button onClick={() => { setModalApiKey(true); setDropdownAperto(false) }}>
     Chiavi MCP
   </button>
   ```
4. Render condizionale del modal in fondo alla lista modal esistenti:
   ```jsx
   {modalApiKey && <ApiKeyPanel onChiudi={() => setModalApiKey(false)} />}
   ```

`ApiKeyPanel` usa `Modal` importato da Dashboard — valutare se estrarre `Modal` in file separato o passarlo come prop. Alternativa più semplice: ridefinire il wrapper inline nel pannello.

---

## Step 4 — RLS su `user_api_keys`

La lista chiavi usa il client anon direttamente (non l'adminClient). Verificare che la tabella abbia RLS attiva con policy `SELECT WHERE user_id = auth.uid()`. Se non presente, aggiungere la policy su Supabase prima di testare il pannello.

---

## Note implementative

- Nessuna traduzione i18n richiesta per ora (le stringhe sono poche e specifiche MCP).
- `ApiKeyPanel` è autonomo: gestisce il proprio stato tramite `useApiKeys`, non usa `usePortafoglio`.
- La chiave plain (`newKey`) non deve mai essere salvata in localStorage o stato persistente.
- Il pulsante Revoca non usa modal custom: `window.confirm()` è sufficiente per questa azione.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementati `useApiKeys.js` (hook CRUD) e `ApiKeyPanel.jsx` (modal con focus trap, banner chiave one-time, snippet Claude Desktop, lista chiavi con revoca). Integrato in Dashboard.jsx: stato `modalApiKey`, voce "Chiavi MCP" nel dropdown, mount condizionale del panel.
<!-- SECTION:FINAL_SUMMARY:END -->
