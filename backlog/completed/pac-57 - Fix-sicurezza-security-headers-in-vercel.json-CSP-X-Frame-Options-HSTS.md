---
id: PAC-57
title: 'Fix sicurezza: security headers in vercel.json (CSP, X-Frame-Options, HSTS)'
status: Done
assignee: []
created_date: '2026-03-14 15:24'
updated_date: '2026-03-15 08:18'
labels:
  - security
  - fix
dependencies:
  - PAC-55
references:
  - pac-dashboard/vercel.json
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere i security headers HTTP in `vercel.json` per proteggersi da clickjacking, MIME sniffing, e attacchi XSS amplificati. Emerso dall'audit PAC-55.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 X-Frame-Options: DENY presente (blocca clickjacking)
- [ ] #2 X-Content-Type-Options: nosniff presente
- [ ] #3 Strict-Transport-Security con max-age >= 31536000 presente
- [ ] #4 Referrer-Policy: strict-origin-when-cross-origin presente
- [ ] #5 Content-Security-Policy configurato (almeno default-src, connect-src per Supabase, frame-ancestors none)
- [ ] #6 Verifica con https://securityheaders.com dopo deploy
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunti in vercel.json: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security (max-age=31536000), Referrer-Policy: strict-origin-when-cross-origin, CSP con default-src/script-src/style-src/connect-src (Supabase)/img-src/font-src/frame-ancestors.
<!-- SECTION:FINAL_SUMMARY:END -->
