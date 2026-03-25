---
id: PAC-65
title: 'Feature: landing page pubblica per utenti non autenticati'
status: Done
assignee: []
created_date: '2026-03-15 09:47'
updated_date: '2026-03-24 10:44'
labels:
  - feature
  - ux
  - release
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Attualmente chi arriva sul sito non autenticato vede direttamente il form di login. Serve una landing page che presenti il prodotto.

## Contenuto proposto

- **Hero**: titolo + sottotitolo descrittivo + CTA "Inizia gratis"
- **Features**: 3-4 punti chiave (traccia il tuo PAC, proiezioni scenari, multi-broker, export/import)
- **Screenshot** o mockup della dashboard
- **CTA finale** + link a login
- Link a Privacy Policy e Termini in fondo

## Comportamento
- Visibile solo agli utenti non autenticati
- Il pulsante "Inizia gratis" / "Accedi" apre il form di auth
- Gli utenti già autenticati vengono reindirizzati direttamente alla dashboard
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Landing page visibile a utenti non autenticati
- [x] #2 Utenti autenticati bypassano la landing e vanno direttamente alla dashboard
- [x] #3 CTA funzionante che porta al form di registrazione/login
- [x] #4 Link a Privacy Policy e Termini di Servizio presenti
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
# Piano implementativo PAC-65

## Analisi architettura

`App.jsx` usa rendering condizionale: `!user → <AuthForm>`, `user → <Dashboard>`. Non c'è router.

**Approccio scelto: stato `mostraAuth` in App.jsx**

```
!user && !mostraAuth  →  <LandingPage onCTA={(tab) => { setDefaultTab(tab); setMostraAuth(true) }} />
!user &&  mostraAuth  →  <AuthForm defaultTab={defaultTab} onBack={() => setMostraAuth(false)} ... />
user                  →  <Dashboard ... />
```

- Nessun router da aggiungere
- `LandingPage` è un componente React con Tailwind, coerente col design dell'app
- `AuthForm` riceve `defaultTab` ("login" o "register") per aprirsi sul tab giusto a seconda del CTA premuto
- Il `<button>` "← Torna alla home" in `AuthForm` richiama `onBack` (prop opzionale)

---

## Contenuto LandingPage

**Hero**
- Titolo: "Il tuo PAC, sempre sotto controllo"
- Sottotitolo: "Traccia acquisti ETF, analizza rendimenti reali e proietta il futuro del tuo portafoglio."
- CTA primaria: "Inizia gratis" → apre AuthForm su tab register
- CTA secondaria: "Accedi" → apre AuthForm su tab login

**Feature cards (4)**
1. 📈 Storico acquisti — Registra ogni acquisto per ISIN con data, importo e broker
2. 🎯 Proiezioni scenari — Stima il valore futuro con scenari di rendimento personalizzabili
3. 🏦 Multi-broker — Filtra e confronta i rendimenti per broker
4. 📦 Export / Import — I tuoi dati in JSON, portabili in qualsiasi momento

**Footer**
- Link "/privacy" e "/termini" (coprendo anche il criterio #4 di PAC-64)

**No screenshot** — troppo complesso da mantenere aggiornato; le feature card con icone sono sufficienti.

---

## File da creare / modificare

| File | Operazione |
|---|---|
| `src/components/LandingPage.jsx` | Crea — componente React, stile dark Tailwind |
| `src/App.jsx` | Modifica — stato `mostraAuth` + `defaultTab`, render logic |
| `src/components/AuthForm.jsx` | Modifica — prop `defaultTab` (default "login"), link "← Torna" se `onBack` presente |

---

## Dettaglio modifiche

### App.jsx
```jsx
const [mostraAuth, setMostraAuth] = useState(false)
const [defaultTab, setDefaultTab] = useState('login')

if (!user) {
  if (!mostraAuth) {
    return <LandingPage onCTA={(tab) => { setDefaultTab(tab); setMostraAuth(true) }} />
  }
  return <AuthForm defaultTab={defaultTab} onSignIn={signIn} onSignUp={signUp} onBack={() => setMostraAuth(false)} />
}
```

### AuthForm.jsx
- Prop `defaultTab = 'login'` — sostituisce lo `useState('login')` iniziale con `useState(defaultTab)`
- Prop `onBack` opzionale — se presente, mostra link "← Torna alla home" sopra i tab

### LandingPage.jsx (struttura)
```
<div min-h-screen bg-slate-900>
  <header>  PAC Dashboard  [Accedi]  </header>
  <main>
    <section hero>  H1 + p + [Inizia gratis] [Accedi]  </section>
    <section features>  4 card con icona + titolo + descrizione  </section>
  </main>
  <footer>  Privacy Policy · Termini di Servizio  </footer>
</div>
```

---

## Step eseguibili autonomamente
1. Creare `src/components/LandingPage.jsx`
2. Modificare `src/App.jsx`
3. Modificare `src/components/AuthForm.jsx`

Tutti e 3 gli step sono autonomi — nessun asset esterno richiesto, nessun placeholder da compilare.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementazione già completata nel codebase. LandingPage.jsx esiste ed è completo (hero, feature cards animate, FAQ con Schema.org, grafico decorativo, badge). App.jsx gestisce lo stato mostraAuth/defaultTab con redirect automatico per utenti autenticati. AuthForm.jsx riceve defaultTab e onBack. Tutti gli AC soddisfatti.
<!-- SECTION:FINAL_SUMMARY:END -->
