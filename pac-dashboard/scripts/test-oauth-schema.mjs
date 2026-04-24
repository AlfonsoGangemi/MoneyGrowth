/**
 * Test di integrazione: verifica che le funzioni SECURITY DEFINER dello schema oauth
 * siano accessibili tramite adminClient.rpc() dal public schema.
 *
 * Esecuzione:
 *   node --env-file=.env scripts/test-oauth-schema.mjs
 *
 * Richiede: VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY nel file .env
 */

import { createClient } from '@supabase/supabase-js'
import { createHash, randomBytes } from 'crypto'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!url || !serviceKey) {
  console.error('ERRORE: VITE_SUPABASE_URL o SUPABASE_SERVICE_KEY mancanti')
  process.exit(1)
}

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function sha256hex(str) {
  return createHash('sha256').update(str).digest('hex')
}

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

let passed = 0
let failed = 0

function ok(label) {
  console.log(`   ✓ ${label}`)
  passed++
}

function fail(label, msg) {
  console.error(`   ✗ ${label}: ${msg}`)
  failed++
}

async function run() {
  console.log('Connessione a:', url)
  console.log()

  // ── 1. oauth_get_client ────────────────────────────────────────────────
  console.log('1. oauth_get_client — client inesistente → array vuoto')
  {
    const { data, error } = await adminClient.rpc('oauth_get_client', {
      p_client_id: 'non-existent-client',
    })
    if (error) fail('rpc chiamabile', error.message)
    else if (Array.isArray(data) && data.length === 0) ok('restituisce array vuoto per client inesistente')
    else fail('risultato inatteso', JSON.stringify(data))
  }
  console.log()

  // ── 2. oauth_register_client ───────────────────────────────────────────
  const testClientId = `test-${b64url(randomBytes(8))}`
  console.log(`2. oauth_register_client — inserisce client di test (${testClientId})`)
  {
    const { error } = await adminClient.rpc('oauth_register_client', {
      p_client_id:     testClientId,
      p_name:          'Test Client PAC-122',
      p_redirect_uris: ['http://localhost:9999/callback'],
    })
    if (error) fail('inserimento client', error.message)
    else ok('client inserito senza errori')
  }
  console.log()

  // ── 3. oauth_get_client — client appena inserito ───────────────────────
  console.log('3. oauth_get_client — client appena inserito → record trovato')
  {
    const { data, error } = await adminClient.rpc('oauth_get_client', {
      p_client_id: testClientId,
    })
    if (error) fail('lettura client', error.message)
    else if (data?.[0]?.is_active === true) ok(`is_active=true, redirect_uris=${JSON.stringify(data[0].redirect_uris)}`)
    else fail('client non trovato o is_active errato', JSON.stringify(data))
  }
  console.log()

  // ── Recupera un user_id reale per i test con FK ───────────────────────
  const { data: usersData } = await adminClient.auth.admin.listUsers({ perPage: 1 })
  const realUserId = usersData?.users?.[0]?.id
  if (!realUserId) {
    console.error('Nessun utente trovato in auth.users — i test 4-8 richiedono almeno un utente registrato.')
    process.exit(1)
  }
  console.log(`   (user_id di test: ${realUserId})`)
  console.log()

  // ── 4. oauth_insert_auth_code ──────────────────────────────────────────
  const rawCode = b64url(randomBytes(32))
  const codeHash = sha256hex(rawCode)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  console.log('4. oauth_insert_auth_code — inserisce authorization code')
  {
    const { error } = await adminClient.rpc('oauth_insert_auth_code', {
      p_code_hash:      codeHash,
      p_client_id:      testClientId,
      p_user_id:        realUserId,
      p_redirect_uri:   'http://localhost:9999/callback',
      p_code_challenge: b64url(createHash('sha256').update('verifier').digest()),
      p_scope:          'portfolio:read',
      p_expires_at:     expiresAt,
    })
    if (error) fail('inserimento auth code', error.message)
    else ok('auth code inserito senza errori')
  }
  console.log()

  // ── 5. oauth_consume_auth_code ─────────────────────────────────────────
  console.log('5. oauth_consume_auth_code — consuma il codice (DELETE...RETURNING)')
  {
    const { data, error } = await adminClient.rpc('oauth_consume_auth_code', {
      p_code_hash: codeHash,
    })
    const row = data?.[0]
    if (error) fail('consume auth code', error.message)
    else if (row?.client_id === testClientId && row?.scope === 'portfolio:read') ok(`riga restituita: client_id=${row.client_id}, scope=${row.scope}`)
    else fail('riga non trovata o dati errati', JSON.stringify(data))
  }
  console.log()

  // ── 6. oauth_consume_auth_code — secondo tentativo → vuoto ────────────
  console.log('6. oauth_consume_auth_code — secondo tentativo sullo stesso hash → array vuoto')
  {
    const { data, error } = await adminClient.rpc('oauth_consume_auth_code', {
      p_code_hash: codeHash,
    })
    if (error) fail('secondo consume', error.message)
    else if (Array.isArray(data) && data.length === 0) ok('codice già consumato — array vuoto corretto')
    else fail('il codice era riutilizzabile', JSON.stringify(data))
  }
  console.log()

  // ── 7. oauth_insert_refresh_token ─────────────────────────────────────
  const rawRT = b64url(randomBytes(48))
  const rtHash = sha256hex(rawRT)
  const rtExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  console.log('7. oauth_insert_refresh_token — inserisce refresh token')
  {
    const { error } = await adminClient.rpc('oauth_insert_refresh_token', {
      p_token_hash: rtHash,
      p_user_id:    realUserId,
      p_client_id:  testClientId,
      p_scope:      'portfolio:read',
      p_expires_at: rtExpires,
    })
    if (error) fail('inserimento refresh token', error.message)
    else ok('refresh token inserito senza errori')
  }
  console.log()

  // ── 8. oauth_rotate_refresh_token ─────────────────────────────────────
  console.log('8. oauth_rotate_refresh_token — rotazione atomica del refresh token')
  const newRawRT = b64url(randomBytes(48))
  const newRtHash = sha256hex(newRawRT)
  const newRtExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  {
    const { data, error } = await adminClient.rpc('oauth_rotate_refresh_token', {
      p_old_hash:       rtHash,
      p_new_hash:       newRtHash,
      p_new_expires_at: newRtExpires,
    })
    const row = data?.[0]
    if (error) fail('rotazione refresh token', error.message)
    else if (row?.user_id === realUserId && row?.scope === 'portfolio:read') ok(`rotazione OK: user_id=${row.user_id}, scope=${row.scope}`)
    else fail('rotazione fallita o dati errati', JSON.stringify(data))
  }
  console.log()

  // ── 9. oauth_rotate_refresh_token — vecchio hash → vuoto ──────────────
  console.log('9. oauth_rotate_refresh_token — vecchio hash non più valido → array vuoto')
  {
    const { data, error } = await adminClient.rpc('oauth_rotate_refresh_token', {
      p_old_hash:       rtHash,
      p_new_hash:       b64url(randomBytes(48)),
      p_new_expires_at: newRtExpires,
    })
    if (error) fail('secondo rotate', error.message)
    else if (Array.isArray(data) && data.length === 0) ok('vecchio token non più valido — array vuoto corretto')
    else fail('il token era riutilizzabile', JSON.stringify(data))
  }
  console.log()

  // ── 10. Schema oauth non esposto via REST API pubblica ───────────────────
  // PostgREST risponde 406 se lo schema non è negli exposed_schemas.
  // Risposta 200 o 403 significa che lo schema è raggiungibile → configurazione errata.
  console.log('10. Schema oauth non esposto via REST (Accept-Profile: oauth → 406 atteso)')
  {
    if (!anonKey) {
      console.log('   SKIP — VITE_SUPABASE_ANON_KEY non presente nel file .env')
    } else {
      const res = await fetch(`${url}/rest/v1/clients`, {
        headers: {
          'Accept-Profile': 'oauth',
          'apikey':         anonKey,
          'Authorization':  `Bearer ${anonKey}`,
        },
      })
      if (res.status === 406) {
        ok('schema oauth non esposto — PostgREST risponde 406 Not Acceptable')
      } else {
        fail(
          'schema oauth ESPOSTO',
          `status ${res.status} — rimuoverlo da exposed_schemas in Supabase Dashboard → Settings → API`,
        )
      }
    }
  }
  console.log()

  // ── Cleanup — rimuove dati di test ─────────────────────────────────────
  console.log('Cleanup: revoca nuovo refresh token di test')
  await adminClient.rpc('oauth_rotate_refresh_token', {
    p_old_hash:       newRtHash,
    p_new_hash:       b64url(randomBytes(48)),
    p_new_expires_at: new Date(Date.now() - 1000).toISOString(),
  })

  // Riepilogo
  console.log()
  console.log(`Risultato: ${passed} passati, ${failed} falliti`)
  if (failed === 0) {
    console.log('✓ Tutte le funzioni SECURITY DEFINER accessibili via adminClient.rpc()')
  } else {
    console.log('✗ Uno o più test falliti — verificare la migrazione PAC-122')
  }
  process.exit(failed === 0 ? 0 : 1)
}

run()
