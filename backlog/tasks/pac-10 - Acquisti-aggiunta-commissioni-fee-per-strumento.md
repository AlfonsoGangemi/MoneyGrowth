---
id: PAC-10
title: 'Acquisti: aggiunta commissioni (fee) per strumento'
status: Done
assignee: []
created_date: '2026-03-10 16:51'
updated_date: '2026-03-11 08:32'
labels:
  - feature
  - frontend
  - database
dependencies:
  - PAC-8
references:
  - src/components/AcquistoForm.jsx
  - src/hooks/usePortafoglio.js
  - src/utils/calcoli.js
  - spec/model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere il campo **fee** (commissione di acquisto) al form di inserimento acquisto e includerlo nei calcoli di rendimento.

### Modello dati

Aggiungere la colonna `fee` alla tabella `acquisti` su Supabase:

```sql
ALTER TABLE acquisti
  ADD COLUMN fee numeric NOT NULL DEFAULT 0;
```

Sul frontend, il mapping in `usePortafoglio.js` espone `fee` come campo dell'acquisto.

### Form di acquisto (`AcquistoForm.jsx`)

- Per ogni ETF selezionato nel form, aggiungere un campo **Fee (€)** con valore di default `0`
- Il campo è opzionale e modificabile manualmente
- Le quote frazionate rimangono calcolate su `importo / prezzo` (la fee non riduce le quote)

### Impatto sui calcoli (`calcoli.js`)

La fee è un costo aggiuntivo che riduce il rendimento netto:

| Indicatore | Modifica |
|---|---|
| **Totale investito** | `Σ importo_investito + Σ fee` |
| **Rendimento netto** | `valore_attuale - totale_investito` (invariato nella formula, cambia la base) |
| **ROI** | `(valore_attuale - totale_investito) / totale_investito × 100` (invariato nella formula) |
| **CAGR / TWRR** | Usano `totale_investito` aggiornato — impatto automatico |

Le fee sono incluse nel `totale_versato` persistito in `portafoglio_storico_annuale` (PAC-7/PAC-9).

### Visualizzazione

- Nella lista acquisti, mostrare la fee accanto all'importo se > 0 (es. `+ €3,00 fee`)
- Negli indicatori, eventuale riga o tooltip che evidenzia il totale fee pagate
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Colonna `fee numeric NOT NULL DEFAULT 0` aggiunta alla tabella `acquisti` su Supabase
- [x] #2 Il form di acquisto include un campo Fee (€) per ogni ETF selezionato, con default 0
- [x] #3 Il campo `fee` viene salvato e caricato correttamente da Supabase tramite `usePortafoglio.js`
- [x] #4 Il totale investito nei calcoli include la somma delle fee (`Σ importo_investito + Σ fee`)
- [x] #5 La lista acquisti mostra la fee se > 0
- [ ] #6 Le fee sono incluse nel `totale_versato` usato in `portafoglio_storico_annuale`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## File da modificare

### 1. `src/utils/calcoli.js`

**`totaleInvestito`** — includere la fee nel costo totale:
```js
// da:
return acquisti.reduce((s, a) => s + a.importoInvestito, 0)
// a:
return acquisti.reduce((s, a) => s + a.importoInvestito + a.fee, 0)
```

**`calcolaIRR`** — i flussi in uscita devono includere la fee:
```js
// da:
importo: -acq.importoInvestito,
// a:
importo: -(acq.importoInvestito + acq.fee),
```

**`indicatoriPortafoglio`** — aggiungere `totFee` nel risultato per la visualizzazione negli indicatori:
```js
for (const etf of etfList) {
  totFee += etf.acquisti.reduce((s, a) => s + a.fee, 0)
}
return { ..., totFee }
```

> `fee` è sempre presente come `number` — nessun fallback `?? 0` necessario.

---

### 2. `src/hooks/usePortafoglio.js`

**`mapAcquisto`** — esporre `fee` nel modello frontend:
```js
fee: Number(row.fee),
```

**`aggiungiAcquistiMultipli`** — salvare `fee` su Supabase:
```js
return {
  ...
  fee: Number(item.fee),
}
```

**`importJSON`** — leggere `fee` nel mapping degli acquisti:
```js
// nella flatMap degli acquisti:
fee: Number(a.fee),
```

---

### 3. `src/components/AcquistoForm.jsx`

**Stato iniziale righe** — aggiungere `fee` con default dall'ultimo acquisto o `'0'`:
```js
fee: String(ultimo?.fee ?? 0),
```
> Il `?? 0` qui è corretto: `ultimo` potrebbe non esistere oppure essere un acquisto pre-migrazione senza fee.

**Layout grid** — il grid è attualmente `grid-cols-3` (Importo / Prezzo / Quote). Aggiungere Fee come quarta cella passando a `grid-cols-2 sm:grid-cols-4`. Su mobile: Fee sotto Importo, Quote sotto Prezzo:
```jsx
<div className="px-4 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
  {/* Importo */}
  {/* Fee */}
  {/* Prezzo */}
  {/* Quote (read-only) */}
</div>
```

**handleSubmit** — includere `fee` negli items:
```js
fee: parseFloat(r.fee) || 0,
```
> `|| 0` corretto: l'input utente potrebbe essere stringa vuota.

---

### 4. `src/components/ETFCard.jsx`

**Lista acquisti espansa** — mostrare fee accanto all'importo se > 0:
```jsx
<span className="text-white">€{fmt(acq.importoInvestito, 0)}</span>
{acq.fee > 0 && (
  <span className="text-amber-400 text-xs">+€{fmt(acq.fee, 2)} fee</span>
)}
```

**KPI "Investito"** — già corretto automaticamente perché chiama `totaleInvestito(etf.acquisti)` che includerà la fee.

---

## Ordine di implementazione

1. `calcoli.js` — modifica `totaleInvestito`, `calcolaIRR`, `indicatoriPortafoglio`
2. `usePortafoglio.js` — `mapAcquisto`, `aggiungiAcquistiMultipli`, `importJSON`
3. `AcquistoForm.jsx` — stato, grid, handleSubmit
4. `ETFCard.jsx` — visualizzazione fee in lista acquisti
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato il campo `fee` su acquisti in tutti i layer:

- **`calcoli.js`**: `totaleInvestito` include `a.fee`, `calcolaIRR` include la fee nei flussi in uscita, `indicatoriPortafoglio` espone `totFee`
- **`usePortafoglio.js`**: `mapAcquisto` espone `fee`, `aggiungiAcquistiMultipli` salva `fee` su Supabase, `importJSON` legge `fee` dal JSON
- **`AcquistoForm.jsx`**: aggiunto campo Fee (€) con default dall'ultimo acquisto, grid passato da `grid-cols-3` a `grid-cols-2 sm:grid-cols-4`
- **`ETFCard.jsx`**: mostra `+€X fee` in amber nella lista acquisti se fee > 0

Il criterio #6 (fee incluse in `totale_versato` di `portafoglio_storico_annuale`) è parte del task PAC-9.
<!-- SECTION:FINAL_SUMMARY:END -->
