---
id: PAC-97
title: 'Feature: indicatore distribuzione percentuale del portafoglio per asset class'
status: Done
assignee: []
created_date: '2026-03-31 15:12'
updated_date: '2026-04-01 22:58'
labels: []
milestone: m-1
dependencies:
  - PAC-96
references:
  - src/components/Indicatori.jsx
  - src/components/Dashboard.jsx
  - src/hooks/usePortafoglio.js
  - src/utils/calcoli.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere un indicatore che mostri come si distribuisce il valore del portafoglio tra le categorie di asset class (Azioni, Obbligazioni, Materie prime, ecc.), espresso in percentuale sul totale. Gli ETF della stessa asset class vengono aggregati. La distribuzione rispetta il filtro broker attivo.

Approccio a due fasi:
- Fase 1 (questo task): implementazione numerica pura — lista asset class con percentuale testuale, senza grafici
- Fase 2 (DRAFT-1): miglioramento visivo con grafico, da decidere dopo verifica UX

Contesto:
- Il campo asset_class_id su ogni ETF è introdotto da PAC-96 (dipendenza)
- I dati di portafoglio sono gestiti da usePortafoglio.js
- Il componente Indicatori.jsx contiene gli indicatori finanziari esistenti (ROI, CAGR, TWRR, ecc.)
- Il Dashboard.jsx gestisce il layout generale e i filtri broker
- La logica di calcolo va in calcoli.js
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 La logica di calcolo è in calcoli.js: aggrega il valore degli ETF per asset class e restituisce un array {assetClass, percentuale} ordinato per percentuale decrescente
- [ ] #2 Le percentuali sommano sempre a 100% (o array vuoto se non ci sono strumenti con valore > 0)
- [ ] #3 Il calcolo rispetta il filtro broker selezionato nel Dashboard: solo gli strumenti dei broker attivi contribuiscono al totale
- [ ] #4 La UI mostra una lista numerica (nome asset class + percentuale testuale, es. "Azioni — 62,4%") senza grafici
- [ ] #5 Il componente si aggiorna dinamicamente al cambio del filtro broker
- [ ] #6 La visualizzazione grafica NON è inclusa in questo task: tracciata in DRAFT-1 da attivare dopo verifica UX
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Prerequisito

PAC-96 completato: ogni ETF nello stato React ha `assetClassNome` (stringa) e `prezzoCorrente`.

## Ordine di esecuzione

1. `calcoli.js` — funzione `distribuzioneAssetClass`
2. `Indicatori.jsx` — sezione distribuzione (lista testuale)

---

## Step 1 — `src/utils/calcoli.js`

Aggiungere funzione esportata:

```js
/**
 * Distribuzione percentuale del portafoglio per asset class.
 * Rispetta il filtro broker: se brokerFiltro non è vuoto, considera
 * solo gli acquisti dei broker selezionati per calcolare il valore.
 *
 * @param {Array}  etfList      - ETF con acquisti, prezzoCorrente, assetClassNome
 * @param {Array}  brokerFiltro - array di UUID; vuoto = tutti i broker
 * @returns Array di { nome: string, percentuale: number } ordinato per percentuale desc
 */
export function distribuzioneAssetClass(etfList, brokerFiltro) {
  const totalePerClasse = new Map()
  let totale = 0

  for (const etf of etfList) {
    const acquistiFiltered = brokerFiltro.length > 0
      ? etf.acquisti.filter(a => brokerFiltro.includes(a.brokerId))
      : etf.acquisti

    const quote = acquistiFiltered.reduce((s, a) => s + a.quoteFrazionate, 0)
    if (quote === 0) continue

    const valore = quote * etf.prezzoCorrente
    const nome = etf.assetClassNome ?? 'Azioni'
    totalePerClasse.set(nome, (totalePerClasse.get(nome) ?? 0) + valore)
    totale += valore
  }

  if (totale === 0) return []

  return [...totalePerClasse.entries()]
    .map(([nome, valore]) => ({
      nome,
      percentuale: Math.round((valore / totale) * 1000) / 10, // 1 decimale
    }))
    .sort((a, b) => b.percentuale - a.percentuale)
}
```

---

## Step 2 — `src/components/Indicatori.jsx`

### Prop da aggiungere

Verificare le prop attuali del componente. Aggiungere `brokerFiltro` se non già presente.
Il componente già riceve `etfList` (o analoga prop con gli ETF filtrati per il portafoglio attivo).

### Sezione distribuzione

Aggiungere import:
```js
import { ..., distribuzioneAssetClass } from '../utils/calcoli'
```

Calcolo dentro il componente:
```js
const distribuzione = distribuzioneAssetClass(etfList, brokerFiltro)
```

Render (dopo gli indicatori esistenti, prima della chiusura):
```jsx
{distribuzione.length > 0 && (
  <div className="...">
    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
      {t('distribuzione_asset_class')}
    </p>
    <ol className="space-y-1">
      {distribuzione.map(({ nome, percentuale }) => (
        <li key={nome} className="flex justify-between text-sm text-slate-700 dark:text-slate-300">
          <span>{nome}</span>
          <span className="font-semibold tabular-nums">
            {new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(percentuale)}%
          </span>
        </li>
      ))}
    </ol>
  </div>
)}
```

---

## Note

- Aggiungere chiave i18n `distribuzione_asset_class` a `src/i18n/it.js` ("Distribuzione per asset class") e `src/i18n/en.js` ("Asset class breakdown")
- Le percentuali usano 1 decimale e sono arrotondate; la somma può differire da 100% di pochi centesimi per effetto degli arrotondamenti — accettabile
- La visualizzazione grafica (PAC-97 AC#6) è esclusa: tracciata in DRAFT-1
<!-- SECTION:PLAN:END -->
