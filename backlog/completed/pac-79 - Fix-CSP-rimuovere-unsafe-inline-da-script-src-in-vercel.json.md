---
id: PAC-79
title: Fix - CSP rimuovere unsafe-inline da script-src in vercel.json
status: Done
assignee: []
created_date: '2026-03-19 08:19'
updated_date: '2026-03-20 11:51'
labels:
  - security
  - chore
milestone: m-0
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
L'header `Content-Security-Policy` in `vercel.json` include `'unsafe-inline'` in `script-src`, che indebolisce la protezione XSS. Verificare se è effettivamente necessario (Tailwind JIT non lo richiede) e rimuoverlo se possibile.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 unsafe-inline rimosso da script-src se la build funziona senza
- [x] #2 In alternativa, documentato perché è necessario e quale rischio comporta
- [x] #3 L'app funziona correttamente in produzione dopo la modifica CSP
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rimosso `'unsafe-inline'` da `script-src` in vercel.json. La build Vite produce solo script esterni (nessuno inline), quindi la rimozione è sicura. Mantenuto `'unsafe-inline'` in `style-src` perché Recharts usa attributi `style` inline sugli elementi SVG. Build verificata senza errori.
<!-- SECTION:FINAL_SUMMARY:END -->
