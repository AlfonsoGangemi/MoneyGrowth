---
id: PAC-91
title: Feature - modale unificata import/export con CTA onboarding in dashboard
status: Done
assignee: []
created_date: '2026-03-24 08:56'
updated_date: '2026-03-25 09:52'
labels:
  - feature
  - ux
  - import
  - export
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Unificare le funzionalità di import ed export dei dati in un'unica modale, migliorare il nome del file esportato e aggiungere una CTA di onboarding visibile quando il portafoglio è vuoto.

## Contesto

Attualmente import ed export sono funzionalità separate. L'obiettivo è consolidarle in una sola modale con tab/sezioni distinte, correggere il prefisso del file esportato e guidare i nuovi utenti con una CTA dedicata nella dashboard vuota.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il file esportato ha nome con prefisso `etflens` (es. `etflens-backup-2026-03-24.json`)
- [x] #2 Esiste una sola modale che gestisce sia import che export, accessibile da un unico punto dell'interfaccia
- [x] #3 Quando la dashboard non contiene ETF né transazioni, viene mostrata una CTA con due opzioni: 'Aggiungi il primo ETF' e 'Importa portafoglio'
- [x] #4 La CTA di importazione nella dashboard vuota apre la modale unificata import/export posizionata sulla tab import
- [x] #5 L'export mantiene tutta la funzionalità precedente (download JSON del portafoglio)
- [x] #6 Il bottone di export nella modale è disabilitato se non esistono ETF né acquisti
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di implementazione

### Stato attuale
- **Export**: `port.exportJSON()` nel dropdown menu → nome file `pac-dashboard-YYYY-MM-DD.json`
- **Import**: `<label>` con `<input type="file">` nello stesso dropdown
- **Empty state** (`Dashboard.jsx:701`): mostra solo il bottone "Aggiungi il primo ETF"

---

### Step 1 — Fix nome file (`usePortafoglio.js:531`)
Cambiare il prefisso del file esportato:
```
pac-dashboard-YYYY-MM-DD.json  →  etflens-backup-YYYY-MM-DD.json
```

### Step 2 — Chiavi i18n (`src/i18n/it.js` e `en.js`)
Aggiungere le chiavi per la nuova modale:
- `import_export_title`
- `import_export_tab_export` / `import_export_tab_import`
- `import_export_scarica`
- `import_export_seleziona`
- `import_export_conferma_sovrascrittura`
- `etf_importa_portafoglio` (CTA empty state)
- `dropdown_import_export` → label voce dropdown (es. "Backup / Ripristino")

### Step 3 — Nuovo componente `ImportExportModal.jsx`
Modale con due tab: **Esporta** e **Importa**.
- **Tab Esporta**: bottone "Scarica JSON" → chiama `onExport()`, disabilitato se `hasData={false}`
- **Tab Importa**: selezione file `.json`, validazione errori inline, messaggio di conferma sovrascrittura
- Props: `{ isOpen, defaultTab, onClose, onExport, onImport, hasData }`
  - `hasData`: `true` se `port.etf.length > 0` (calcolato in Dashboard, passato come prop)

### Step 4 — Aggiornare `Dashboard.jsx`
1. Aggiungere stati: `[modalImportExport, setModalImportExport]` e `[importExportTab, setImportExportTab]`
2. **Dropdown menu**: sostituire i due item separati (export + import) con un unico bottone etichettato **"Backup / Ripristino"** che apre `ImportExportModal` **sul tab export** (`defaultTab='export'`)
3. Spostare la logica `handleImport` dentro la modale
4. **Empty state** (`Dashboard.jsx:701`): aggiungere bottone "Importa portafoglio" che apre la modale **sul tab import** (`defaultTab='import'`)

---

### Ordine di esecuzione
1. Fix nome file (isolato, zero rischi)
2. Chiavi i18n
3. Nuovo `ImportExportModal.jsx`
4. Integrazione in `Dashboard.jsx`
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Modifiche apportate

**`usePortafoglio.js`**: nome file esportato cambiato da `pac-dashboard-` a `etflens-backup-`.

**`src/i18n/it.js` + `en.js`**: aggiunte chiavi `dropdown_import_export`, `import_export_title`, `import_export_tab_export/import`, `import_export_scarica`, `import_export_nessun_dato`, `import_export_seleziona`, `import_export_conferma`, `etf_importa_portafoglio`.

**`src/components/ImportExportModal.jsx`** (nuovo): modale con due tab Esporta/Importa. Tab export disabilitato se `hasData=false`. Import con confirm nativo prima di sovrascrivere. `defaultTab` si risincronizza ad ogni apertura.

**`src/components/Dashboard.jsx`**: import del nuovo componente, rimossi stati `errImport` e funzione `handleImport`, i due item dropdown sostituiti da un unico bottone "Backup / Ripristino" (`defaultTab='export'`), empty state aggiornato con secondo CTA "Importa portafoglio" (`defaultTab='import'`), `ImportExportModal` montato come componente always-rendered con `isOpen`.
<!-- SECTION:FINAL_SUMMARY:END -->
