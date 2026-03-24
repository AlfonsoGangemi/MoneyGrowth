---
id: PAC-85
title: 'Setup email etflens.app con Zoho Mail (info, support, privacy)'
status: Done
assignee: []
created_date: '2026-03-21 15:18'
updated_date: '2026-03-23 12:22'
labels:
  - infrastruttura
  - email
  - go-live
dependencies:
  - PAC-83
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurare email per il dominio **etflens.app** e creare gli indirizzi necessari per la gestione del servizio.

## Stato attuale

Zoho Mail sembrava gratuito ma richiede pagamento durante il setup. Valutare le alternative sotto.

## Opzioni valutate

### Opzione A — Zoho Mail "Forever Free"
- Riprovare il signup selezionando esplicitamente il piano **Forever Free** (non il trial Enterprise)
- Supporta dominio custom, SMTP outbound, fino a 5 account
- Se disponibile, è la soluzione più completa

### Opzione B — ImprovMX free + Gmail SMTP (consigliata se Zoho non funziona)
- **ImprovMX** (improvmx.com) — forwarding gratuito verso Gmail per il dominio custom
- **Gmail SMTP** — configurare Gmail per inviare "come" `privacy@etflens.app`
  - Gmail → Impostazioni → Account → "Aggiungi un altro indirizzo email"
  - SMTP host: `smtp.gmail.com`, porta 587, con App Password Gmail
- Pro: funziona subito, gratuito, nessun nuovo account da gestire
- Contro: soluzione ibrida (ricezione su Gmail, invio via Gmail con alias)

### Opzione C — Cloudflare Email Routing + Gmail SMTP
- Simile a B ma con Cloudflare come forwarder (se il dominio è su Cloudflare)
- Forwarding gratuito illimitato, zero configurazione DNS aggiuntiva

### Opzione D — Forward Email (forwardemail.net)
- ❌ Piano gratuito: solo forwarding, **nessun SMTP outbound**, indirizzi pubblicamente ricercabili
- Non adatto per email di contatto ufficiali

## Verifica dominio (DNS)

Indipendentemente dall'opzione scelta, aggiungere record DNS sul registrar:
- **TXT** per verifica proprietà dominio
- **MX** per instradare la posta
- **SPF** (TXT) per autenticazione mittente
- **DKIM** (TXT) per firma crittografica
- **DMARC** (TXT, opzionale ma consigliato) per policy anti-spoofing

## Indirizzi da creare

| Indirizzo | Scopo |
|---|---|
| `privacy@etflens.app` | Richieste GDPR, data deletion — già usato nei documenti legali |
| `support@etflens.app` | Assistenza utenti |
| `info@etflens.app` | Contatto generale |
| `noreply@etflens.app` | Mittente email transazionali Supabase (opzionale ma consigliato) |

## Aggiornamenti conseguenti

Dopo la configurazione, verificare che i documenti legali usino l'indirizzo corretto:
- `pac-dashboard/public/privacy.html`
- `pac-dashboard/public/termini.html`

## Note
- Conservare le credenziali in un password manager
- La propagazione DNS può richiedere fino a 24–48h
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Account Zoho creato e dominio etflens.app verificato
- [ ] #2 Record DNS configurati: MX, SPF, DKIM (e opzionalmente DMARC)
- [ ] #3 Indirizzi info@, support@, privacy@etflens.app attivi e testati (invio + ricezione)
- [ ] #4 Email di contatto aggiornate nei documenti legali dell'app (privacy, termini)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Task archiviato manualmente dall'utente. La configurazione email etflens.app tramite Zoho Mail era bloccata da un problema del data center Zoho. L'utente ha deciso di procedere con una soluzione alternativa (Cloudflare + Gmail, task PAC-88).
<!-- SECTION:FINAL_SUMMARY:END -->
