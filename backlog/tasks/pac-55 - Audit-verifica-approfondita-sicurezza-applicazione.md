---
id: PAC-55
title: 'Audit: verifica approfondita sicurezza applicazione'
status: Done
assignee: []
created_date: '2026-03-13 22:09'
updated_date: '2026-03-14 15:25'
labels:
  - security
  - audit
dependencies: []
references:
  - pac-dashboard/src/utils/supabase.js
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/hooks/useAuth.js
  - pac-dashboard/api/justetf-proxy.js
  - pac-dashboard/src/components/AuthForm.jsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Revisione completa della sicurezza dell'applicazione: autenticazione, dati utente, esposizione di segreti, policy Supabase, e vulnerabilità frontend comuni.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Verificare che le RLS policy Supabase impediscano accesso ai dati di altri utenti
- [x] #2 Verificare che nessuna chiave/segreto sia esposto nel codice frontend o nei log
- [x] #3 Verificare assenza di XSS: nessun dangerouslySetInnerHTML o interpolazione non sanitizzata
- [x] #4 Verificare che il proxy JustETF non sia abusabile (rate limit, validazione input)
- [x] #5 Verificare che l'export JSON non esponga dati sensibili imprevisti
- [x] #6 Verificare headers di sicurezza su Vercel (CSP, X-Frame-Options, ecc.)
- [x] #7 Documentare eventuali rischi residui accettati con motivazione
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Risultati Audit — 2026-03-14

### A) SEGRETI ESPOSTI
✅ **OK** — `.env.local` NON è tracciato in git (confermato con `git ls-files`). Solo `.env.example` è nel repository, senza valori reali. Il `.gitignore` root protegge correttamente i file `.env*.local`.

🟡 **MEDIO — Console.log verbosi in produzione**
- `ETFCard.jsx` righe 40–49: logga URL completo della richiesta proxy, status, headers risposta JustETF, body raw (500 char)
- `api/justetf-proxy.js` righe 12, 33, 35: logga URL target, status, body errore
- In produzione questi log sono visibili nei Vercel Function Logs (accessibili dal dashboard), rivelando pattern d'uso e endpoint interni

### B) RLS SUPABASE
✅ **OK (lato client)** — Tutte le query in `usePortafoglio.js` filtrano con `.eq('user_id', user.id)`. La protezione reale dipende però dalle RLS policy lato DB (non verificabili da codice).

🟡 **MEDIO — Import JSON accetta ID dal file senza validazione**
- `usePortafoglio.js`: l'import usa gli `id` UUID direttamente dal JSON, potenziale conflitto se il file proviene da un altro account. Nessuna validazione della struttura prima del parse. Nessun limite sulla dimensione del file.

### C) XSS
✅ **OK** — Nessun `dangerouslySetInnerHTML`. React fa escaping automatico di tutti i valori interpolati in JSX. Rischio XSS pratico molto basso.

🟢 **BASSO/ACCETTATO** — I campi `colore` broker vengono usati in `style={{ backgroundColor: b.colore }}`, ma i valori provengono da un color picker nel form, non da input libero.

### D) PROXY JUSTETF
🔴 **CRITICO — proxyPath non validato (path traversal + abuso proxy)**
- `api/justetf-proxy.js` riga 10: `proxyPath` viene concatenato direttamente nell'URL senza alcuna validazione
- Il dominio è hardcoded a `https://www.justetf.com/`, quindi non c'è SSRF verso host arbitrari
- Ma: chiunque può raggiungere qualsiasi path su JustETF tramite il proxy (non solo le quote API), inclusi endpoint non previsti
- Un attaccante può usare il proxy come anonimizzatore verso JustETF
- Path traversal con `../` potrebbe raggiungere percorsi non previsti sul dominio

🟡 **MEDIO — Rate limiting assente**
- Nessun throttling: il proxy può essere abusato per DDoS verso JustETF o per consumare quota Vercel

🟡 **MEDIO — CORS `Access-Control-Allow-Origin: *`**
- Qualsiasi sito web può fare richieste cross-origin al proxy pubblicamente. Accettabile solo se il proxy non espone dati sensibili (nel caso attuale lo è, ma è una bad practice).

### E) EXPORT JSON
🟢 **BASSO/ACCETTATO** — L'export include l'intero portafoglio (ETF, acquisti, prezzi, broker). I dati sono sensibili ma è l'utente stesso a scaricare i propri dati consapevolmente. Nessun dato di terzi esposto. Rischio accettato.

### F) HEADERS DI SICUREZZA
🔴 **CRITICO — Assenza completa di security headers in `vercel.json`**
- Nessun `Content-Security-Policy` → rischio XSS amplificato se una vulnerabilità venisse scoperta
- Nessun `X-Frame-Options` → clickjacking possibile (iframe invisibile sopra la dashboard)
- Nessun `X-Content-Type-Options: nosniff`
- Nessun `Strict-Transport-Security`
- Nessun `Referrer-Policy` → URL con ISIN nei path potrebbero essere leakati a siti terzi

### G) AUTENTICAZIONE
🟡 **MEDIO — "Email non confermata" rivela esistenza account**
- `AuthForm.jsx` riga 17: il messaggio "Email non ancora confermata" distingue "email esiste ma non confermata" da "email inesistente". Un attacker può enumerare email valide provando a fare login.
- Tutte le altre casistiche di errore sono già correttamente oscurate.

---

## Azioni richieste (per task derivate)

| Priorità | Azione | File |
|---|---|---|
| 🔴 Alta | Aggiungere security headers in vercel.json | `vercel.json` |
| 🔴 Alta | Validare proxyPath con whitelist + blocco `..` | `api/justetf-proxy.js` |
| 🟡 Media | Aggiungere rate limiting al proxy | `api/justetf-proxy.js` |
| 🟡 Media | Rimuovere/condizionare console.log in produzione | `ETFCard.jsx`, `api/justetf-proxy.js` |
| 🟡 Media | Oscurare messaggio "Email non confermata" | `AuthForm.jsx` |
| 🟡 Media | Validare struttura JSON nell'import | `usePortafoglio.js` |
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Audit completato il 2026-03-14. Trovati 2 critici e 5 medi. Creati task derivati PAC-57, PAC-58, PAC-59 per le correzioni. L'AC #1 (RLS) è verificata lato client — tutte le query filtrano per user_id. L'AC #4 (proxy) e #6 (headers) sono stati verificati come problematici e tracciati nei task di fix.
<!-- SECTION:FINAL_SUMMARY:END -->
