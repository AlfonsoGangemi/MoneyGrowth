---
id: m-4
title: "Import Acquisti PRO — caricamento CSV broker"
---

## Description

Feature PRO: caricamento diretto di file CSV da broker (Trade Republic e futuri) tramite UI dell'app. L'utente PRO carica il CSV nella sezione Broker → il sistema esegue il merge incrementale degli acquisti in Supabase, con dedup per `tr_transaction_id`. Nessuna dipendenza dal bot Telegram: questo milestone è l'infrastruttura core su cui m-3 (Telegram bot) si appoggerà come canale delivery alternativo.
