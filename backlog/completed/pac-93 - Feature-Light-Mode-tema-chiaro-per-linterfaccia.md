---
id: PAC-93
title: 'Feature: Light Mode - tema chiaro per l''interfaccia'
status: Done
assignee: []
created_date: '2026-03-25 14:14'
updated_date: '2026-07-30 13:48'
labels:
  - ui
  - theme
dependencies: []
modified_files:
  - pac-dashboard/src/hooks/useTheme.jsx
  - pac-dashboard/src/components/ThemeToggle.jsx
  - pac-dashboard/src/App.jsx
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/components/LandingPage.jsx
  - pac-dashboard/src/components/AuthForm.jsx
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/src/components/AcquistoForm.jsx
  - pac-dashboard/src/components/Indicatori.jsx
  - pac-dashboard/src/components/TabellaProiezione.jsx
  - pac-dashboard/src/components/GraficoPortafoglio.jsx
  - pac-dashboard/src/components/ImportExportModal.jsx
  - pac-dashboard/src/components/CsvAiModal.jsx
  - pac-dashboard/src/components/Privacy.jsx
  - pac-dashboard/src/components/Termini.jsx
  - pac-dashboard/src/components/WatchlistPanel.jsx
  - pac-dashboard/src/components/BrokerImportPanel.jsx
  - pac-dashboard/src/components/OAuthConsent.jsx
  - pac-dashboard/src/components/ApiKeyPanel.jsx
  - pac-dashboard/src/components/LinguaToggle.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere il supporto al tema chiaro (light mode) nell'applicazione PAC Dashboard, attualmente solo dark mode. L'utente deve poter passare tra tema chiaro e scuro con un toggle, e la preferenza deve essere persistita.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Toggle visibile nell'interfaccia (es. header o impostazioni) per passare tra light e dark mode
- [x] #2 Il tema chiaro applica correttamente colori di sfondo, testo, card, grafici e tutti i componenti
- [x] #3 La preferenza del tema è persistita in localStorage e ripristinata al ricaricamento della pagina
- [x] #4 Tutti i componenti (ETFCard, GraficoPortafoglio, Indicatori, AcquistoForm, AuthForm) sono compatibili con entrambi i temi
- [x] #5 Il tema di default è dark se localStorage è assente o contiene un valore non valido
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Contesto tecnico

- **Tailwind v4** via `@tailwindcss/vite` (nessun `tailwind.config.js`)
- Dark mode non configurato: tutti i componenti usano classi hardcoded dark (`bg-slate-900`, `text-slate-100`, ecc.)
- `body` in `index.css` ha background e colore hardcoded dark
- Pattern locale esistente: `useLocale` / `LocaleProvider` in `src/hooks/useLocale.jsx` (da replicare per il tema)

---

## Step 1 — Configurare Tailwind v4 per class-based dark mode

**File: `src/index.css`**

Aggiungere la custom variant per dark mode basata su classe `.dark` sull'elemento `<html>`:

```css
@custom-variant dark (&:is(.dark *));
```

Rendere `body` neutro (i colori verranno gestiti dalle classi Tailwind nei componenti):

```css
body {
  margin: 0;
  min-height: 100vh;
}
```

---

## Step 2 — Hook `useTheme`

**Nuovo file: `src/hooks/useTheme.jsx`**

Simile a `useLocale`. Gestisce:
- Lettura da `localStorage('pac_theme')` — valori: `'dark'` | `'light'`
- Fallback su `window.matchMedia('(prefers-color-scheme: dark)')` se non presente in localStorage
- Applica/rimuove classe `dark` su `document.documentElement` ad ogni cambio
- Espone `{ tema, toggleTema }` via context (`ThemeProvider` + `useTheme`)

**File: `src/App.jsx`**

Avvolgere `<LocaleProvider>` con `<ThemeProvider>` (o viceversa, l'ordine è indifferente).

---

## Step 3 — Toggle nel UI

Aggiungere un pulsante sole ☀️ / luna 🌙 (icone SVG, no emoji) nei tre contesti dove appare l'header:

- `Dashboard.jsx` — accanto a `<LinguaToggle>` nell'header sticky
- `LandingPage.jsx` — nella navbar in alto
- `AuthForm.jsx` — opzionale, sotto il logo (se lo si ritiene utile)

Il toggle chiama `toggleTema()` da `useTheme()`.

---

## Step 4 — Palette di mapping dark → light

Mappatura sistematica delle classi da applicare nei componenti:

| Classe dark (attuale) | Aggiunta light mode |
|---|---|
| `bg-slate-900` | `bg-white` |
| `bg-slate-800` | `bg-slate-100` |
| `bg-slate-700` | `bg-slate-200` |
| `bg-slate-900/80` | `bg-white/80` |
| `bg-slate-900/60` | `bg-slate-100/60` |
| `text-white` | `text-slate-900` |
| `text-slate-100` | `text-slate-800` |
| `text-slate-200` | `text-slate-700` |
| `text-slate-400` | `text-slate-500` |
| `text-slate-500` | `text-slate-400` |
| `border-slate-700` | `border-slate-200` |
| `border-slate-800` | `border-slate-200` |
| `hover:bg-slate-700` | `hover:bg-slate-200` |

Con Tailwind v4 + `@custom-variant dark`: si usano prefissi `dark:` per le varianti scure. Siccome i componenti sono attualmente hardcoded in dark, la strategia è:
- **invertire la logica**: le classi di base diventano light, le varianti `dark:` diventano dark
- Esempio: `bg-slate-900` → `bg-white dark:bg-slate-900`

---

## Step 5 — Aggiornamento componenti (ordine consigliato)

### 5a. `AuthForm.jsx`
Componente isolato, buon punto di partenza. Classi principali: `bg-slate-900` (sfondo pagina), `bg-slate-800` (card), `bg-slate-700` (input/tab).

### 5b. `LandingPage.jsx`
Molte sezioni con sfondi, testi, badge. Verificare anche le sezioni marketing con colori fissi (`blue-*`).

### 5c. `Dashboard.jsx`
Header sticky, dropdown menu, modal overlay. Punto più denso di classi.

### 5d. `ETFCard.jsx`
Card con badge colorati (verde/rosso per performance) — queste classi colorate rimangono uguali in entrambi i temi.

### 5e. `AcquistoForm.jsx`
Form con input, select, button.

### 5f. `Indicatori.jsx` e `TabellaProiezione.jsx`
Tabelle e griglie di metriche.

### 5g. `GraficoPortafoglio.jsx` ⚠️ caso speciale
I colori dei grafici Recharts sono **prop JS inline**, non classi CSS. Servono i colori del tema come valori JS.

Soluzione: leggere `useTheme()` nel componente e passare i colori condizionalmente:
```js
const { tema } = useTheme()
const coloreGriglia = tema === 'dark' ? '#334155' : '#e2e8f0'
const coloreTooltip = tema === 'dark' ? '#1e293b' : '#f8fafc'
```

### 5h. `ImportExportModal.jsx` e `CsvAiModal.jsx`
Modal con overlay. Stesse classi di `Dashboard.jsx`.

### 5i. `Privacy.jsx` e `Termini.jsx`
Pagine statiche con testo lungo.

---

## Ordine di esecuzione

1. Step 1 (CSS config) + Step 2 (hook) — prerequisiti, senza questi i `dark:` non funzionano
2. Step 3 (toggle) — visibile subito per testare manualmente
3. Step 4-5 — componente per componente, testando visivamente dopo ogni file

### Nota — Sezione FAQ (in LandingPage.jsx, step 5b)

L'accordion FAQ usa classi standard già coperte dal mapping della step 4:
- `bg-slate-800` → `bg-white dark:bg-slate-800` (button accordion)
- `bg-slate-800/50` → `bg-slate-100/50 dark:bg-slate-800/50` (pannello aperto)
- `border-slate-700` / `hover:border-slate-600` → `border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600`
- `text-white` → `text-slate-900 dark:text-white`
- `text-slate-400` → `text-slate-600 dark:text-slate-400`

`border-blue-500/60` (stato aperto) è già neutro rispetto al tema — non va modificato.

Nessun caso speciale: la FAQ rientra nel normale aggiornamento di `LandingPage.jsx`.

### Nota — Default tema: dark

Se `localStorage('pac_theme')` è assente o contiene un valore non valido (diverso da `'dark'` e `'light'`), il tema di default è **dark** (non `prefers-color-scheme`).

Logica di inizializzazione in `useTheme.jsx`:
```js
const stored = localStorage.getItem('pac_theme')
const temaIniziale = (stored === 'light' || stored === 'dark') ? stored : 'dark'
```

L'acceptance criteria #4 (`prefers-color-scheme` come default) va rimosso — il comportamento scelto è dark fisso come fallback.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementazione completa via analisi statica del codice (senza verifica visiva nel browser, su richiesta esplicita dell'utente). Hook `useTheme` (context + localStorage key `lightMode`, fallback dark se assente/non valido) applica/rimuove la classe `.dark` su `<html>`. `ThemeToggle` integrato in Dashboard, LandingPage e AuthForm. Tutti i componenti con classi hardcoded dark sono stati convertiti al pattern `bg-white dark:bg-slate-900` (invertendo la logica: base = light, `dark:` = scuro), verificato su 18 file. Caso speciale `GraficoPortafoglio.jsx`: colori Recharts (grid, tick, reference line) passati come prop JS condizionali su `tema` dell'hook, non essendo gestibili via classi CSS.
<!-- SECTION:FINAL_SUMMARY:END -->
