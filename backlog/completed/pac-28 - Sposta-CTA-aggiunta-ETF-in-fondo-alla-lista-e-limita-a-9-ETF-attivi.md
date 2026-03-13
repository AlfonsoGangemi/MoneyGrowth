---
id: PAC-28
title: Sposta CTA aggiunta ETF in fondo alla lista e limita a 9 ETF attivi
status: Done
assignee: []
created_date: '2026-03-12 16:05'
updated_date: '2026-03-13 20:04'
labels:
  - ux
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Migliorare la UX della gestione ETF:

1. **CTA "Aggiungi ETF"** — spostare il pulsante/form di aggiunta ETF in fondo alla lista degli ETF esistenti, non in cima
2. **Limite 9 ETF attivi** — non è possibile aggiungere un nuovo ETF se ci sono già 9 ETF non archiviati
3. **Dearchiviazione bloccata** — non è possibile dearchiviare un ETF se ci sono già ≥9 ETF attivi; mostrare un messaggio esplicativo

## Note

- Il limite di 9 in `aggiungiETF` (`if (stato.etf.length >= 9)`) conta tutti gli ETF inclusi gli archiviati — va corretto per contare solo quelli attivi
- La UI deve nascondere o disabilitare il pulsante "Aggiungi ETF" quando si raggiunge il limite, con tooltip/messaggio esplicativo
- Il pulsante di dearchiviazione deve essere disabilitato (con messaggio) quando gli attivi sono già 9
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La CTA di aggiunta ETF appare in fondo alla lista degli ETF esistenti
- [x] #2 Non è possibile aggiungere un nuovo ETF se ci sono già 9 ETF attivi (non archiviati)
- [x] #3 Il pulsante aggiungi è disabilitato o nascosto con messaggio esplicativo quando il limite è raggiunto
- [x] #4 Non è possibile dearchiviare un ETF se gli ETF attivi sono già ≥9
- [x] #5 Il pulsante di dearchiviazione è disabilitato con messaggio esplicativo quando il limite è raggiunto
- [x] #6 Il controllo in aggiungiETF conta solo gli ETF non archiviati
- [x] #7 In fase di import JSON, i primi 9 ETF non archiviati vengono importati come attivi; gli eventuali ETF in eccesso vengono automaticamente impostati come archiviati
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di Intervento

### Analisi stato attuale

- **`Dashboard.jsx` riga 499**: `port.etf.length < 9` conta tutti gli ETF inclusi gli archiviati — bug da correggere (AC#6)
- **`Dashboard.jsx` righe 478–507**: il bottone `+ ETF` è nell'header della sezione ETF Grid, accanto a "Aggiorna tutti" e "+ Acquisto" — va spostato in fondo alla lista (AC#1)
- **ETF archiviati**: il bottone archivia/dearchivia in `ETFCard` usa lo stesso handler `onArchivia` sia per archiviare che per dearchiviare (toggle). Non c'è protezione dal limite lato UI (AC#4, #5)
- **`usePortafoglio.js`**: verificare che `aggiungiETF` conti solo ETF attivi nel check limite

### File coinvolti

1. `pac-dashboard/src/components/Dashboard.jsx` — modifiche principali
2. `pac-dashboard/src/components/ETFCard.jsx` — aggiunta prop `archivaDisabilitato`
3. `pac-dashboard/src/hooks/usePortafoglio.js` — fix check limite in `aggiungiETF`

---

### Step 1 — Fix check limite in `usePortafoglio.js`

Trovare `aggiungiETF` e correggere il controllo:
```js
// prima
if (stato.etf.length >= 9) return
// dopo
if (stato.etf.filter(e => !e.archiviato).length >= 9) return
```

---

### Step 2 — Calcola conteggio ETF attivi reali in `Dashboard.jsx`

Aggiungere variabile (indipendente da `brokerFiltro`) subito dopo `etfArchiviati`:
```js
const etfAttiviReali = port.etf.filter(e => !e.archiviato).length
const limitRaggiunto = etfAttiviReali >= 9
```

---

### Step 3 — Rimuovi bottone `+ ETF` dall'header

Rimuovere il blocco `{port.etf.length < 9 && (<button ...>+ ETF</button>)}` dall'header (righe 499-506), mantenendo solo "Aggiorna tutti" e "+ Acquisto".

---

### Step 4 — Aggiungi CTA in fondo alla griglia attivi

Dopo la chiusura della griglia degli ETF attivi (`</div>`) e prima della sezione archiviati, inserire:
```jsx
{/* CTA aggiunta ETF in fondo alla lista */}
{!limitRaggiunto ? (
  <button
    onClick={() => setModalNuovoETF(true)}
    className="mt-4 w-full text-sm border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 py-3 rounded-2xl transition-colors"
  >
    + Aggiungi ETF
  </button>
) : (
  <p className="mt-4 text-center text-xs text-slate-500">
    Limite di 9 ETF attivi raggiunto — archivia un ETF per aggiungerne un altro
  </p>
)}
```

---

### Step 5 — Blocca dearchiviazione in `ETFCard.jsx`

Aggiungere prop `archivaDisabilitato` a `ETFCard`. Nel bottone archivia:
```jsx
<button
  onClick={() => !archivaDisabilitato && onArchivia(etf.id)}
  disabled={archivaDisabilitato}
  title={archivaDisabilitato ? 'Limite di 9 ETF attivi raggiunto' : 'Archivia ETF'}
  className={`... ${archivaDisabilitato ? 'opacity-30 cursor-not-allowed' : ''}`}
>
```

---

### Step 6 — Passa prop agli ETF archiviati in `Dashboard.jsx`

Nelle card degli ETF archiviati, passare:
```jsx
<ETFCard
  ...
  archivaDisabilitato={limitRaggiunto}
/>
```

Per gli ETF **attivi** non serve: archiviare un attivo riduce il conteggio, quindi non va bloccato.

---

### Step 7 — Gestione empty state

Lo stato vuoto (nessun ETF) già mostra un bottone "Aggiungi il primo ETF" — nessuna modifica necessaria.

---

### Step 8 — Gestione limite in `importJSON` (`usePortafoglio.js`)

Nel mapping `etfRows` (riga ~518), applicare il limite prima dell'insert su Supabase:
```js
// Applica limite 9 ETF attivi durante l'import
let attiviCount = 0
const etfRows = data.etf.map(etf => {
  const archiviato = etf.archiviato || attiviCount >= 9
  if (!archiviato) attiviCount++
  return {
    id:              etf.id,
    user_id:         user.id,
    nome:            etf.nome,
    isin:            etf.isin,
    emittente:       etf.emittente || '',
    importo_fisso:   etf.importoFisso,
    prezzo_corrente: etf.prezzoCorrente,
    archiviato,
  }
})
```

Nota: l'ordine degli ETF nel JSON determina quali sono i "primi 9". Gli ETF già archiviati nel JSON non consumano slot.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementati tutti gli 8 step del piano:

- **Step 1**: `aggiungiETF` in `usePortafoglio.js` ora conta solo ETF non archiviati nel check limite (`filter(e => !e.archiviato).length >= 9`)
- **Step 2**: Aggiunte variabili `etfAttiviReali` e `limitRaggiunto` in `Dashboard.jsx` (indipendenti da `brokerFiltro`)
- **Step 3**: Rimosso il bottone `+ ETF` dall'header della sezione ETF
- **Step 4**: Aggiunta CTA dashed `+ Aggiungi ETF` in fondo alla griglia attivi; se limite raggiunto mostra messaggio testuale
- **Step 5**: `ETFCard.jsx` — aggiunta prop `archivaDisabilitato`; il bottone archivia è disabilitato con tooltip esplicativo
- **Step 6**: Le card degli ETF archiviati ricevono `archivaDisabilitato={limitRaggiunto}` per bloccare la dearchiviazione
- **Step 7**: Empty state invariato (già corretto)
- **Step 8**: `importJSON` applica il limite 9 ETF attivi durante l'import — gli ETF in eccesso vengono automaticamente archiviati
<!-- SECTION:FINAL_SUMMARY:END -->
