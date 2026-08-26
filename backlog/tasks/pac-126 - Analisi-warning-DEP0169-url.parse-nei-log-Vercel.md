---
id: PAC-126
title: Analisi warning DEP0169 url.parse() nei log Vercel
status: Done
assignee: []
created_date: '2026-04-28 11:20'
labels:
  - investigation
  - vercel
  - build
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Contesto

Nel log Vercel del 2026-04-28 è apparso il seguente warning classificato come `[error]`:

```
(node:4) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized
and prone to errors that have security implications. Use the WHATWG URL API instead.
CVEs are not issued for `url.parse()` vulnerabilities.
(Use `node --trace-deprecation ...` to show where the warning was created)
```

## Risultati dell'indagine

### Origine

Il warning **non proviene dal codice applicativo** né dalle API serverless. Proviene dal pacchetto **`follow-redirects`** incluso nel bundle di Vite, nel file:

```
node_modules/vite/dist/node/chunks/config.js:21211
```

Il codice incriminato (dentro `follow-redirects`, bundled da Vite):

```javascript
var useNativeURL = false;
try {
    assert$1(new URL$2(""));
} catch (error$1) {
    useNativeURL = error$1.code === "ERR_INVALID_URL";
}

function parseUrl(input) {
    if (useNativeURL) parsed = new URL$2(input);
    else {
        parsed = validateUrl(url.parse(input));  // ← qui il warning
    }
}
```

### Quando viene triggerato

Il warning appare durante la **fase di build su Vercel** (quando `npm run build` esegue Vite), **non a runtime** nelle serverless function. Se `useNativeURL` rimane `false` per qualche edge-case nell'ambiente Vercel, il branch `url.parse` viene percorso.

### Versioni coinvolte

- **Vite**: 7.3.2 (devDependency)
- **Node.js su Vercel**: 22.x (versione non specificata nel progetto → Vercel usa il default corrente)
- **DEP0169**: introdotto in Node.js 22 come warning a runtime per `url.parse()`

### Impatto

- **Nessun impatto su produzione**: il warning riguarda solo la build-time
- **Nessun impatto sulle serverless function**: `url.parse` non è usato in nessun file `api/`
- Il warning è classificato `[error]` da Vercel perché emesso su `stderr`, ma non è un errore

## Opzioni di fix

| Opzione | Impatto | Consiglio |
|---|---|---|
| **A** — Aggiungere `"engines": { "node": "20.x" }` in `package.json` | Pin build + runtime a Node 20, nessun DEP0169 | Solo se si vuole stare su Node 20 LTS |
| **B** — Aggiungere `NODE_OPTIONS=--no-deprecation` come env var Vercel (solo build) | Sopprime tutti i warning di deprecation in build | Blunt hammer, non raccomandato |
| **C** — Non fare nulla | Il warning rimane nei log ma non causa problemi | **Raccomandato**: è un problema upstream di Vite/follow-redirects |

## Conclusione

Il warning è **benigno e non richiede azioni immediate**. È un problema upstream di `follow-redirects` (dipendenza transitiva di Vite) che verrà risolto in un aggiornamento futuro. Il codebase dell'applicazione non usa `url.parse()` in nessun punto.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Indagine completata. Il DEP0169 proviene da `follow-redirects` bundled in Vite 7.3.2, attivato durante la build su Vercel Node 22. Il codice applicativo e le API serverless sono puliti. Nessun intervento necessario.
<!-- SECTION:FINAL_SUMMARY:END -->
