---
id: PAC-99
title: 'Feature: auto-compilazione form ETF da ExtraETF API'
status: To Do
assignee: []
created_date: '2026-04-01 09:37'
updated_date: '2026-04-01 12:41'
labels:
  - feature
milestone: m-1
dependencies:
  - PAC-96
references:
  - pac-dashboard/api/justetf-proxy.js
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Permettere all'utente di recuperare automaticamente nome, emittente e asset_class di un ETF a partire dall'ISIN, tramite una CTA nella modale di modifica ETFCard.

## Endpoint

```
GET https://extraetf.com/api-v2/detail/?isin={ISIN}&extraetf_locale=it
```

## Campi da estrarre dalla risposta

| Campo ExtraETF | Campo form | Note |
|---|---|---|
| `fondname` | `nome` | Nome completo del fondo |
| `shortname` | `emittente` | Emittente (iShares, Vanguard, Amundi…) |
| `asset_class` | `asset_class_id` | ID numerico da mappare al nome (vedi sotto) |

## Mapping asset_class ExtraETF → asset_class.nome

```
2    → "Azioni"
3    → "Obbligazioni"
4    → "Materie prime"
1160 → "Immobili"
5    → "Mercato monetario"
9    → "Portafogli di ETF"
1240 → "Criptovalute"
```

## Architettura

- Nuovo proxy serverless `api/extraetf-detail.js` che accetta `?isin=...` e restituisce `{ nome, emittente, assetClassNome }`
- Il proxy aggiunge gli header necessari per aggirare le restrizioni CORS di extraetf.com
- Nella modale di modifica di ETFCard viene aggiunta una CTA (es. "Recupera info da ISIN") che chiama il proxy usando l'ISIN già presente
- I campi ricevuti sovrascrivono i valori nel form; i campi rimangono modificabili dall'utente

## Comportamento in caso di errore

- ISIN non trovato, API non raggiungibile o risposta non valida → viene mostrato un messaggio di errore inline; i valori esistenti nel form non vengono modificati
- asset_class non mappato (ID sconosciuto) → viene assegnato il default "Azioni"
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il proxy `api/extraetf-detail.js` accetta `?isin=...` e restituisce `{ nome, emittente, assetClassNome }` estratti dall'API ExtraETF
- [ ] #2 Il mapping tra ID numerici ExtraETF e nomi asset_class è definito nel proxy: 2=Azioni, 3=Obbligazioni, 4=Materie prime, 1160=Immobili, 5=Mercato monetario, 9=Portafogli di ETF, 1240=Criptovalute
- [ ] #3 Nella modale di modifica di ETFCard è presente una CTA 'Recupera info da ISIN' che chiama il proxy usando l'ISIN dell'ETF corrente
- [ ] #4 Se il proxy risponde con successo, i campi nome/emittente/asset_class nel form vengono aggiornati con i valori ricevuti
- [ ] #5 I campi aggiornati rimangono modificabili dall'utente
- [ ] #6 Se il proxy non risponde, restituisce errore o l'ISIN non è trovato, viene mostrato un messaggio di errore inline e i valori esistenti nel form non vengono modificati
- [ ] #7 Se l'asset_class restituita ha un ID non mappato, viene assegnato il default 'Azioni'
- [ ] #8 Durante la chiamata al proxy la CTA mostra uno stato di caricamento ed è disabilitata fino al completamento
- [ ] #9 Il proxy rispetta lo stesso schema di rate limiting e sicurezza di `justetf-proxy.js`
- [ ] #10 Il link esterno sull'ISIN in ETFCard (riga ~84) punta a `https://extraetf.com/it/etf-profile/{ISIN}` al posto dell'URL JustETF attuale
- [ ] #11 Le stringhe i18n che menzionano JustETF vengono aggiornate per riferirsi a ExtraETF: `isin_non_trovato` (it+en) e `etf_sync_update` (it+en)
- [ ] #12 Il link 'Dati di mercato' in Dashboard.jsx (riga ~311) punta a `https://extraetf.com` al posto di `https://www.justetf.com`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Prerequisito

PAC-96 completato: `ModificaETFModal` ha il `<select>` per `assetClassId`.

## Ordine di esecuzione

1. `api/extraetf-detail.js` — proxy REST ExtraETF detail
2. `Dashboard.jsx` `ModificaETFModal` — CTA "Recupera info da ISIN"
3. `ETFCard.jsx` — link ISIN → ExtraETF
4. `src/i18n/it.js` + `src/i18n/en.js` — stringhe JustETF → ExtraETF
5. `Dashboard.jsx` — link "Dati di mercato" → ExtraETF

---

## Step 1 — `pac-dashboard/api/extraetf-detail.js` (nuovo file)

Pattern identico a `justetf-proxy.js` (rate limiting in-memory, stessa struttura).

```js
const RATE_LIMIT = 60
const RATE_WINDOW = 60 * 1000
const rateMap = new Map()

function isRateLimited(ip) { /* stessa logica di justetf-proxy.js */ }

// Mapping ID numerico ExtraETF → nome asset class locale
const ASSET_CLASS_MAP = {
  2:    'Azioni',
  3:    'Obbligazioni',
  4:    'Materie prime',
  1160: 'Immobili',
  5:    'Mercato monetario',
  9:    'Portafogli di ETF',
  1240: 'Criptovalute',
}

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Troppe richieste.' })

  const { isin } = req.query
  if (!isin || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) {
    return res.status(400).json({ error: 'ISIN non valido' })
  }

  const url = `https://extraetf.com/api-v2/detail/?isin=${isin}&extraetf_locale=it`

  let response
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':          'application/json',
        'Referer':         'https://extraetf.com/',
        'Origin':          'https://extraetf.com',
      },
    })
  } catch {
    return res.status(502).json({ error: 'errore di rete' })
  }

  if (!response.ok) {
    return res.status(response.status).json({ error: `upstream ${response.status}` })
  }

  let body
  try { body = await response.json() } catch {
    return res.status(502).json({ error: 'risposta non JSON' })
  }

  const fondname = body?.fondname ?? body?.results?.[0]?.fondname
  const shortname = body?.shortname ?? body?.results?.[0]?.shortname
  const assetClassId = body?.asset_class ?? body?.results?.[0]?.asset_class

  if (!fondname) return res.status(404).json({ error: 'ISIN non trovato' })

  const assetClassNome = ASSET_CLASS_MAP[assetClassId] ?? 'Azioni'

  return res.status(200).json({
    nome: fondname,
    emittente: shortname ?? '',
    assetClassNome,
  })
}
```

> **Nota:** La struttura della risposta ExtraETF va verificata al momento dell'implementazione — la risposta potrebbe avere i campi sotto una chiave `results[0]` o direttamente nell'oggetto root. Adattare di conseguenza.

---

## Step 2 — `Dashboard.jsx` `ModificaETFModal`

### 2a. Aggiungere stato e chiamata

Aggiungere stato di loading/errore CTA:
```js
const [fetchStato, setFetchStato] = useState('idle') // 'idle' | 'loading' | 'error'
const [fetchErrorMsg, setFetchErrorMsg] = useState('')
```

Aggiungere funzione:
```js
async function recuperaInfoISIN() {
  if (!etf.isin || fetchStato === 'loading') return
  setFetchStato('loading')
  setFetchErrorMsg('')
  try {
    const res = await fetch(`/api/extraetf-detail?isin=${etf.isin}`)
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? `HTTP ${res.status}`)
    }
    const data = await res.json()
    if (data.nome)      setNome(data.nome)
    if (data.emittente) setEmittente(data.emittente)
    // Risolvi assetClassNome → assetClassId tramite la lista assetClasses
    if (data.assetClassNome && assetClasses.length > 0) {
      const ac = assetClasses.find(a => a.nome === data.assetClassNome)
      if (ac) setAssetClassId(ac.id)
    }
    setFetchStato('idle')
  } catch (err) {
    setFetchErrorMsg(err.message || t('etf_fetch_error'))
    setFetchStato('error')
  }
}
```

### 2b. UI — pulsante CTA e messaggio errore

Aggiungere nella modale, sopra i campi del form:
```jsx
<div className="flex items-center gap-2 mb-4">
  <button
    type="button"
    onClick={recuperaInfoISIN}
    disabled={fetchStato === 'loading' || !etf.isin}
    className="text-xs px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
  >
    {fetchStato === 'loading' && (
      <svg className="w-3 h-3 animate-spin" ... />
    )}
    {t('etf_recupera_info')}
  </button>
  {fetchStato === 'error' && fetchErrorMsg && (
    <span className="text-xs text-red-500 dark:text-red-400">{fetchErrorMsg}</span>
  )}
</div>
```

---

## Step 3 — `ETFCard.jsx` riga 73

Cambiare:
```js
// PRIMA (riga 73)
const justEtfUrl = `https://www.justetf.com/it/etf-profile.html?isin=${etf.isin}#panoramica`
```

In:
```js
const extraEtfUrl = `https://extraetf.com/it/etf-profile/${etf.isin}`
```

Aggiornare tutte le occorrenze di `justEtfUrl` nel JSX in `extraEtfUrl` (righe ~85, ~89).

---

## Step 4 — `src/i18n/it.js` e `src/i18n/en.js`

**it.js** (riga 142 e 165):
```js
// PRIMA
isin_non_trovato: 'ISIN non trovato su JustETF',
// DOPO
isin_non_trovato: 'ISIN non trovato su ExtraETF',

// PRIMA
etf_sync_update: 'Aggiorna prezzo da JustETF',
// DOPO
etf_sync_update: 'Aggiorna prezzo da ExtraETF',
```

**en.js** (riga 142 e 165):
```js
// PRIMA
isin_non_trovato: 'ISIN not found on JustETF',
// DOPO
isin_non_trovato: 'ISIN not found on ExtraETF',

// PRIMA
etf_sync_update: 'Update price from JustETF',
// DOPO
etf_sync_update: 'Update price from ExtraETF',
```

Aggiungere in entrambi i file le nuove chiavi:
```js
etf_recupera_info: 'Recupera info da ISIN',   // it
etf_recupera_info: 'Fetch info from ISIN',    // en
etf_fetch_error: 'Errore nel recupero info',  // it
etf_fetch_error: 'Error fetching info',       // en
```

---

## Step 5 — `Dashboard.jsx` riga ~311

Cambiare:
```jsx
// PRIMA
<a href="https://www.justetf.com" ...>JustETF</a>
// DOPO
<a href="https://extraetf.com" ...>ExtraETF</a>
```

---

## Note

- PAC-99 dipende da PAC-96 solo per il `<select>` di asset class nella modal (`setAssetClassId`). Se PAC-96 non è ancora completato, step 2 può essere implementato senza la risoluzione di `assetClassNome`
- La validazione ISIN nel proxy è semplificata (formato regex); errori upstream vengono propagati come messaggio inline nel form
- I campi aggiornati dalla CTA rimangono modificabili dall'utente (no readonly)
- L'aggiornamento del link in Dashboard "Dati di mercato" (step 5) e le stringhe i18n (step 4) sono indipendenti da PAC-96 e possono essere implementati subito
<!-- SECTION:PLAN:END -->
