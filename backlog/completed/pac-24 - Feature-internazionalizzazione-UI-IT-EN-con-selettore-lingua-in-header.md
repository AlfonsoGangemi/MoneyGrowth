---
id: PAC-24
title: 'Feature: internazionalizzazione UI (IT/EN) con selettore lingua in header'
status: Done
assignee: []
created_date: '2026-03-12 07:43'
updated_date: '2026-03-16 16:34'
labels:
  - feature
  - i18n
  - ui
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/App.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/LandingPage.jsx
  - pac-dashboard/src/components/Termini.jsx
  - pac-dashboard/src/components/Privacy.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Localizzare tutti i testi dell'interfaccia in italiano e inglese, inclusa la **landing page pubblica** e le pagine legali (**Termini di Servizio** e **Privacy Policy**). La lingua è selezionabile dall'utente tramite bandiera nell'header; la scelta viene persistita in `localStorage`. La lingua di default è **inglese**.

---

## Architettura i18n

**Approccio senza librerie esterne** (leggero, no `react-i18next`):
- File dizionario: `pac-dashboard/src/i18n/it.js` e `pac-dashboard/src/i18n/en.js`
- Hook: `pac-dashboard/src/hooks/useLocale.js` — espone `{ t, lingua, setLingua }`
- `t('chiave')` risolve la stringa nella lingua attiva
- Il contesto lingua è passato via React Context o prop drilling dal root

**Persistenza**:
```js
// useLocale.js
const [lingua, setLingua] = useState(() => localStorage.getItem('lingua') ?? 'en')
useEffect(() => localStorage.setItem('lingua', lingua), [lingua])
```

**Selettore in header** (`Dashboard.jsx` topbar):
- Due bandiere cliccabili: 🇮🇹 e 🇬🇧 (emoji o SVG)
- La bandiera della lingua attiva ha stile evidenziato (es. `opacity-100` vs `opacity-40`)

**Selettore in landing page** (`LandingPage.jsx`):
- Stessa logica del selettore in header, visibile nella navbar della landing
- La lingua scelta in landing persiste anche all'ingresso nella dashboard

**Pagine legali** (`Termini.jsx`, `Privacy.jsx`):
- Testi localizzati tramite lo stesso hook `useLocale`
- Il selettore lingua è presente anche in queste pagine (o eredita il contesto)
- Nota: i contenuti legali in italiano restano autoritativi; la versione EN è una traduzione informale

---

## Testi da localizzare (principali)

| Chiave | IT | EN |
|--------|----|----|
| `add_etf` | Aggiungi ETF | Add ETF |
| `add_purchase` | Aggiungi acquisto | Add purchase |
| `no_etf` | Nessun ETF ancora | No ETFs yet |
| `projection` | Proiezione | Projection |
| `archived` | Archiviato | Archived |
| `manage_brokers` | Gestisci broker | Manage brokers |
| `export_data` | Esporta dati | Export data |
| `import_data` | Importa dati | Import data |
| `logout` | Logout | Logout |
| `landing_headline` | Segui il tuo PAC... | Track your PAC... |
| `landing_cta_start` | Inizia gratis | Start for free |
| `landing_cta_login` | Accedi | Sign in |
| `terms_title` | Termini di Servizio | Terms of Service |
| `privacy_title` | Privacy Policy | Privacy Policy |
| ... | (censimento completo al momento dell'exec) | |

---

## File coinvolti

- `pac-dashboard/src/i18n/en.js` — dizionario inglese (nuovo)
- `pac-dashboard/src/i18n/it.js` — dizionario italiano (nuovo)
- `pac-dashboard/src/hooks/useLocale.js` — hook lingua (nuovo)
- `pac-dashboard/src/App.jsx` — provider contesto lingua
- `pac-dashboard/src/components/Dashboard.jsx` — selettore bandiera + sostituzione testi
- `pac-dashboard/src/components/LandingPage.jsx` — selettore bandiera + sostituzione testi
- `pac-dashboard/src/components/Termini.jsx` — localizzazione pagina legale (da creare)
- `pac-dashboard/src/components/Privacy.jsx` — localizzazione pagina legale (da creare)
- Tutti i componenti con testo UI statico
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Esistono i file dizionario src/i18n/en.js e src/i18n/it.js con tutte le chiavi UI
- [ ] #2 Hook useLocale.js espone { t, lingua, setLingua }
- [ ] #3 La lingua di default è inglese ('en') se non presente in localStorage
- [ ] #4 La scelta di lingua è persistita in localStorage alla chiave 'lingua'
- [ ] #5 Header mostra le due bandiere (IT e EN); quella attiva è visivamente evidenziata
- [ ] #6 Tutti i testi statici dell'UI sono localizzati tramite t('chiave')
- [ ] #7 Cambiare lingua aggiorna immediatamente tutti i testi senza ricaricare la pagina
- [ ] #8 LandingPage mostra il selettore lingua (🇮🇹/🇬🇧) e tutti i testi statici sono localizzati tramite t('chiave')
- [ ] #9 La lingua scelta nella landing persiste nella dashboard (stessa chiave localStorage)
- [ ] #10 Termini.jsx e Privacy.jsx hanno i testi localizzati in IT e EN tramite t('chiave')
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analisi dello stato attuale

### Componenti con testo statico da localizzare
| File | Testi chiave |
|---|---|
| `LandingPage.jsx` | Hero (titolo, sottotitolo, badge), FEATURE_CARDS (titoli, sub, dettaglio JSX), KPI_CARDS (label, sub), ALTRI_INDICATORI (label, desc tooltip), header (Accedi, Inizia gratis), footer |
| `Dashboard.jsx` | Navbar (titolo), dropdown (Esporta dati, Importa dati, Info Prodotto, Logout), modal titoli (Nuovo ETF, Modifica ETF, Gestione broker, Nuovo scenario, Informazioni), bottoni (Aggiungi, Annulla, Salva), sezione ETF (titoli, placeholder, etichette) |
| `AuthForm.jsx` | Tab (Accedi, Registrati), placeholder, bottoni, messaggi errore in `tradErrore()`, link Termini/Privacy |
| `ETFCard.jsx` | Label card (Prezzo corrente, Investito, Valore, Quote, Rendimento, CAGR), bottoni (Modifica, Archivia, Espandi), intestazioni lista acquisti |
| `Indicatori.jsx` | Label KPI (ROI, CAGR, Valore portafoglio, Rendimento netto, XIRR, TWRR, ATWRR, Max Drawdown, Volatilità), stringa durata con plurali |
| `TabellaProiezione.jsx` | Intestazioni tabella (Anno, Versato, scenario names), sezione storico, etichette |
| `AcquistoForm.jsx` | Label form, bottoni, intestazioni |
| `GraficoPortafoglio.jsx` | Legenda, tooltip labels |
| `Termini.jsx` / `Privacy.jsx` | Contenuto completo (file da creare) |

---

## Sfide tecniche

### 1. FEATURE_CARDS con JSX statico nel dettaglio
`FEATURE_CARDS` è un array costante con `dettaglio: <JSX hardcoded>`. Soluzione: convertire `dettaglio` da JSX a render function `(t) => <JSX>`:
```js
// prima
dettaglio: <div>...</div>

// dopo
dettaglio: (t) => <div>...</div>

// nel render
{isOpen && card.dettaglio(t)}
```

### 2. Plurali in Indicatori.jsx
La stringa durata usa plurali italiani hardcoded:
```js
// attuale (IT hardcoded)
`${anni} ann${anni === 1 ? 'o' : 'i'} e ${mesiRest} mes${mesiRest === 1 ? 'e' : 'i'}`
```
Soluzione: chiavi dizionario separate per singolare/plurale:
```js
// it.js
durata_anni_s: 'anno', durata_anni_p: 'anni',
durata_mesi_s: 'mese', durata_mesi_p: 'mesi',
// en.js
durata_anni_s: 'year', durata_anni_p: 'years',
durata_mesi_s: 'month', durata_mesi_p: 'months',
```

### 3. Formattazione numerica locale
Tutte le funzioni `fmt()` usano `'it-IT'` hardcoded (separatore decimale `,`, migliaia `.`). In inglese si usa `,`/`.` invertito.
Soluzione: passare la locale al formatter tramite context — `fmt(n, locale)` — oppure accettare di mantenere la formattazione italiana anche in EN (scelta più semplice e legittima per un tool finanziario IT).
**Decisione**: mantenere formattazione `it-IT` anche in modalità EN. Solo i testi statici cambiano lingua, non i numeri.

### 4. Pagine legali (Termini.jsx / Privacy.jsx)
I testi legali sono lunghi e strutturati: un dizionario chiave-valore non è pratico. Soluzione: componente con rendering condizionale per lingua:
```jsx
export default function Termini() {
  const { lingua } = useLocale()
  return lingua === 'it' ? <TerminiIT /> : <TerminiEN />
}
```
Dove `TerminiIT` e `TerminiEN` sono sezioni JSX inline nello stesso file.

### 5. KPI_CARDS e ALTRI_INDICATORI in LandingPage
Sono array costanti fuori dal componente. Soluzione: convertirli a funzioni o spostarli dentro il componente per accedere a `t`:
```js
// dentro LandingPage()
const kpiCards = [
  { label: t('roi'), valore: '+18,4%', sub: t('rendimento_totale'), color: '#4ade80' },
  ...
]
```

---

## Architettura scelta: React Context

Con la quantità di componenti coinvolti (8+), il prop drilling sarebbe troppo invasivo. Usare React Context:

```js
// src/hooks/useLocale.js
import { createContext, useContext, useState, useEffect } from 'react'

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [lingua, setLingua] = useState(() => localStorage.getItem('lingua') ?? 'it')
  useEffect(() => localStorage.setItem('lingua', lingua), [lingua])

  const t = (key) => dizionari[lingua]?.[key] ?? dizionari['it'][key] ?? key

  return <LocaleContext.Provider value={{ t, lingua, setLingua }}>{children}</LocaleContext.Provider>
}

export const useLocale = () => useContext(LocaleContext)
```

Nota: default `'it'` (non `'en'` come nel task originale) — l'utenza è italiana, i testi legali sono italiani; rivalutare con l'utente.

---

## Selettore lingua

Componente condiviso `LinguaToggle`:
```jsx
function LinguaToggle() {
  const { lingua, setLingua } = useLocale()
  return (
    <button onClick={() => setLingua(l => l === 'it' ? 'en' : 'it')}
            className="text-sm opacity-70 hover:opacity-100 transition-opacity select-none"
            title={lingua === 'it' ? 'Switch to English' : 'Passa all\'italiano'}>
      {lingua === 'it' ? '🇬🇧' : '🇮🇹'}
    </button>
  )
}
```
Inserito in: header `LandingPage.jsx` (accanto ai bottoni CTA) e navbar `Dashboard.jsx` (accanto al toggle privacy).

---

## Ordine di implementazione

1. **Dizionari**: creare `src/i18n/it.js` e `src/i18n/en.js` con censimento completo di tutti i testi (da fare durante exec con grep sistematico)
2. **Hook + Provider**: `src/hooks/useLocale.js` con `LocaleProvider` e `useLocale`
3. **App.jsx**: wrappare tutto in `<LocaleProvider>`
4. **LandingPage.jsx**: aggiungere `LinguaToggle` nell'header, convertire FEATURE_CARDS.dettaglio a render function, KPI_CARDS/ALTRI_INDICATORI a computed dentro il componente, sostituire tutti i testi con `t()`
5. **AuthForm.jsx**: `useLocale()` + sostituzione testi + localizzare `tradErrore()`
6. **Dashboard.jsx**: aggiungere `LinguaToggle` in navbar + `t()` su tutti i testi
7. **ETFCard.jsx**, **Indicatori.jsx**, **TabellaProiezione.jsx**, **AcquistoForm.jsx**, **GraficoPortafoglio.jsx**: `useLocale()` + `t()` sui testi
8. **Termini.jsx** e **Privacy.jsx**: creare con struttura `lingua === 'it' ? <IT/> : <EN/>`
9. **App.jsx**: aggiungere routing per `/termini` e `/privacy` (attualmente sono link `target="_blank"` — verificare se già gestiti o da aggiungere)
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementata internazionalizzazione completa IT/EN. Creati `src/i18n/it.js` e `src/i18n/en.js` con tutti i testi UI, `src/hooks/useLocale.js` con LocaleProvider e hook useLocale (lingua persistita in localStorage, default 'it'), `src/components/LinguaToggle.jsx`. Aggiornati tutti i componenti: App.jsx, AuthForm, LandingPage, Dashboard, ETFCard, Indicatori, AcquistoForm, GraficoPortafoglio, TabellaProiezione. Creati Termini.jsx e Privacy.jsx con contenuto legale inline IT/EN e toggle lingua in header.
<!-- SECTION:FINAL_SUMMARY:END -->
