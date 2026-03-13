---
id: PAC-44
title: 'Analisi: verifica correttezza algoritmo proiezione annuale'
status: Done
assignee: []
created_date: '2026-03-13 18:12'
updated_date: '2026-03-13 19:27'
labels:
  - analisi
  - calcoli
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verificare che la formula di proiezione anno per anno in `TabellaProiezione` sia corretta.

Formula attesa:
```
valore(X+1) = (valore(X) + pac_mensile * 12) * (1 + rendimento_annuo)
```

Esempio concreto da validare:
- `pac_mensile = 400`
- `valore(X) = 6.551`
- `rendimento = 6%`
- Atteso: `valore(X+1) = (6.551 + 4.800) * 1.06 = 12.032`

Punti da verificare:
1. La formula in `proiezioniPerScenario` usa `(val + versamentoAnnuo) * (1 + sc.rendimentoAnnuo)` — corrisponde alla formula attesa?
2. Il `valoreBase` di partenza è l'ultimo valore dello storico reale (`ultimoStorico?.valore`) o il valore calcolato `valoreOggi`?
3. Il `versamentoAnnuo` include solo gli ETF non archiviati (`importoFisso` sommato)?
4. La proiezione composta anno per anno è economicamente corretta (i versamenti mensili vengono capitalizzati insieme al capitale)?
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 La formula implementata corrisponde a: valore(X+1) = (valore(X) + pac_mensile*12) * (1 + r)
- [ ] #2 Il valore base di partenza è correttamente il valore reale dell'ultimo anno storico disponibile
- [ ] #3 Il versamento annuo considera solo gli ETF attivi (non archiviati)
- [ ] #4 Se la formula è errata, viene proposta e implementata la correzione
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analisi risultato

### Formula core (riga 139 TabellaProiezione.jsx)
```js
val = (val + versamentoAnnuo) * (1 + sc.rendimentoAnnuo)
```
Corrisponde all'esempio: `(6551 + 4800) * 1.06 = 12.032` ✅ — nessuna modifica necessaria.

### `valoreBase` e `baseVersato`
Calcolati da `ultimoStorico?.valore` e `ultimoStorico?.totaleVersato` ✅  
`ultimoStorico = storicoAnnuale[storicoAnnuale.length - 1]` — **presuppone array ordinato**.

---

## Problemi da correggere

### Bug 1 — storicoAnnuale potrebbe non essere ordinato
**Riga 126**: `ultimoStorico = storicoAnnuale[storicoAnnuale.length - 1]`  
Se `storicoAnnuale` non è ordinato per anno crescente, `ultimoStorico` potrebbe essere un anno intermedio → `valoreBase` e `baseVersato` errati → tutta la proiezione sbagliata.

**Fix**: ordinare esplicitamente per anno prima di estrarre `ultimoStorico`:
```js
const storicoOrdinato = [...storicoAnnuale].sort((a, b) => a.anno - b.anno)
const ultimoStorico = storicoOrdinato.length > 0 ? storicoOrdinato[storicoOrdinato.length - 1] : null
```
(e usare `storicoOrdinato` al posto di `storicoAnnuale` in tutto il `useMemo`)

### Bug 2 — yIdx negativo per anni-gap senza storico
**Righe 170-172**: per un anno passato senza record storico, `isReale=false` → il ramo proiezione calcola `yIdx` negativo → `valori[yIdx]` = `undefined` → `?? 0` → mostra **€ 0** come valore proiettato.

**Fix**: filtrare le righe in modo che gli anni passati senza storico vengano saltati (non mostrati), oppure aggiungerli come righe `tipo: 'gap'` con valore `null` e renderle con un placeholder.

Soluzione più semplice: nel loop righe, saltare l'anno se è passato e non ha storico:
```js
if (annoCalendario < annoCorrente && !storico) continue
```

---

## Riepilogo interventi
1. Ordinare `storicoAnnuale` per anno dentro il `useMemo` (safety, 1 riga)
2. Saltare anni passati senza storico nel loop righe (1 riga)
3. Nessuna modifica alla formula di proiezione
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Formula core confermata corretta: `(val + versamentoAnnuo) * (1 + r)` corrisponde all'esempio atteso. Implementati due fix: (1) `storicoAnnuale` ora ordinato per anno prima di estrarre `ultimoStorico`, evitando `valoreBase` errato se l'array non è ordinato; (2) anni passati senza record storico saltati con `continue` nel loop righe, evitando `yIdx` negativo che produceva €0 come valore proiettato.
<!-- SECTION:FINAL_SUMMARY:END -->
