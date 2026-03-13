---
id: PAC-41
title: 'Fix: ridurre il margine sinistro del grafico portafoglio su desktop'
status: Done
assignee: []
created_date: '2026-03-13 17:52'
updated_date: '2026-03-13 17:58'
labels:
  - ui
  - fix
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Su desktop il grafico portafoglio ha un margine sinistro eccessivo, probabilmente causato dalla larghezza fissa dell'asse Y (`width={80}`) che riserva troppo spazio. Va ridotto per avvicinare il grafico al bordo sinistro del contenitore.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il margine sinistro del grafico su desktop è visivamente bilanciato con gli altri lati
- [ ] #2 Le label dell'asse Y rimangono leggibili e non vengono tagliate
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Ridotto il margine sinistro del LineChart da `left: 10` a `left: 0` e la larghezza dell'asse Y da 80 a 40px su desktop. Su mobile l'asse Y usa `width={0}` con `mirror={true}` per mostrare le label dentro il grafico senza occupare spazio laterale.
<!-- SECTION:FINAL_SUMMARY:END -->
