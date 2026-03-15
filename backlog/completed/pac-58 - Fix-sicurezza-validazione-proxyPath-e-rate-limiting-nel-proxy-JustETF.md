---
id: PAC-58
title: 'Fix sicurezza: validazione proxyPath e rate limiting nel proxy JustETF'
status: Done
assignee: []
created_date: '2026-03-14 15:25'
updated_date: '2026-03-15 08:18'
labels:
  - security
  - fix
dependencies:
  - PAC-55
references:
  - pac-dashboard/api/justetf-proxy.js
  - pac-dashboard/src/components/ETFCard.jsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il proxy `api/justetf-proxy.js` accetta qualsiasi `proxyPath` senza validazione, permettendo l'accesso a endpoint arbitrari su JustETF e abuso del proxy. Aggiungere whitelist dei path consentiti, blocco path traversal (`..`), rate limiting e CORS ristretto. Emerso dall'audit PAC-55.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 proxyPath accetta solo path nella whitelist (es. api/etfs/ per le quote)
- [ ] #2 Richieste con .. nel path vengono rifiutate con 400
- [ ] #3 Rate limiting: max 60 richieste/minuto per IP (o per deployment)
- [ ] #4 CORS ristretto al dominio di produzione invece di *
- [ ] #5 Console.log rimossi o condizionati a NODE_ENV !== production
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Proxy rewrite: whitelist path (solo `api/etfs/`), blocco `..`, rate limiting in-memory 60 req/min per IP (best-effort su Vercel serverless), CORS da env var ALLOWED_ORIGIN (senza fallback wildcard), console.log rimossi in production.
<!-- SECTION:FINAL_SUMMARY:END -->
