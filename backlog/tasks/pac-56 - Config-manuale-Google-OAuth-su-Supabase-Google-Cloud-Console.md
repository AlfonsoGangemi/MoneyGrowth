---
id: PAC-56
title: 'Config manuale: Google OAuth su Supabase + Google Cloud Console'
status: To Do
assignee: []
created_date: '2026-03-13 22:30'
updated_date: '2026-03-25 12:07'
labels:
  - auth
  - config
  - manual
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
⚠️ **Task manuale** — nessun codice da scrivere. Configurazione necessaria prima di implementare PAC-53.

Prerequisito per il login con Google: registrare l'applicazione su Google Cloud Console e abilitare il provider Google in Supabase.

---

## Step 1 — Google Cloud Console

1. Vai su https://console.cloud.google.com e seleziona (o crea) il progetto
2. Menu → **APIs & Services** → **OAuth consent screen**
   - User Type: **External**
   - Compila: nome app (`ETF Lens`), email supporto, email sviluppatore
   - Scopes: lascia i default (`email`, `profile`, `openid`)
   - Salva e continua fino a fine wizard
3. Menu → **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `ETF Lens`
   - **Authorized JavaScript origins**:
     - `http://localhost:5173`
     - `https://etflens.app`
   - **Authorized redirect URIs**:
     - `https://<ref>.supabase.co/auth/v1/callback` ← trovi `<ref>` in Supabase → Settings → API → Project URL
     - `http://localhost:5173`
     - `https://etflens.app`
4. Clicca **Create** → copia **Client ID** e **Client Secret** (servono al passo successivo)

---

## Step 2 — Supabase: abilitare provider Google

1. Vai su https://supabase.com/dashboard → progetto → **Authentication** → **Providers**
2. Trova **Google** → abilita il toggle
3. Incolla **Client ID** e **Client Secret** ottenuti da Google Cloud Console
4. Salva

---

## Step 3 — Supabase: URL Configuration

1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://etflens.app`
3. **Additional Redirect URLs**: aggiungi `http://localhost:5173`
4. Salva

---

## Step 4 — Supabase: Link by email (consigliato)

Questa impostazione determina cosa succede se un utente ha già un account email+password con la stessa email dell'account Google.

1. **Authentication** → **Settings**
2. Trova **"Link accounts by email"**
   - **Abilitato** (consigliato): Supabase collega automaticamente i due account → l'utente può accedere sia con email/password che con Google usando la stessa identità
   - **Disabilitato** (default): i due account restano separati, possibile confusione per l'utente
3. Scegliere **Abilitato** per una UX coerente

---

## Verifica

- Aprire l'app in locale dopo PAC-53 implementato
- Cliccare "Continua con Google" → completare il flusso OAuth → si deve essere reindirizzati alla dashboard loggati
- Testare anche da `https://etflens.app`

---

## Stato attuale (2026-03-25)

- PAC-53 (implementazione frontend) non ancora completata: `useAuth.js` non ha `signInWithGoogle`, `AuthForm.jsx` non ha il pulsante Google
- Il dominio di produzione è `etflens.app` (rebrand completato, ex `pac-dashboard.vercel.app`)
- Il task rimane bloccante per PAC-53
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Provider Google abilitato in Supabase con Client ID e Client Secret validi
- [x] #2 Authorized JavaScript origins configurati in Google Cloud Console: localhost:5173 + etflens.app
- [x] #3 Authorized redirect URIs configurati in Google Cloud Console: callback Supabase + localhost + etflens.app
- [x] #4 Site URL impostato su https://etflens.app in Supabase Authentication → URL Configuration
- [x] #5 Additional Redirect URLs include http://localhost:5173
- [ ] #6 Link by email abilitato in Supabase Authentication → Settings
- [ ] #7 Il flusso OAuth funziona sia in locale che su etflens.app (verificabile dopo PAC-53)
<!-- AC:END -->
