import { createClient } from '@supabase/supabase-js'

function buildClients(jwt) {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return { authClient, adminClient }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()

  const authHeader = req.headers['authorization'] ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!jwt) return res.status(401).json({ error: 'Autorizzazione mancante' })

  const { authClient, adminClient } = buildClients(jwt)

  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) return res.status(401).json({ error: 'JWT non valido' })

  if (req.method === 'GET') return handleCheck(adminClient, user.id, res)
  if (req.method === 'POST') return handleImport(adminClient, user.id, req, res)
  return res.status(405).json({ error: 'Metodo non consentito' })
}

// GET /api/import — verifica se l'utente ha il piano PRO
async function handleCheck(adminClient, userId, res) {
  const { data, error } = await adminClient
    .from('config')
    .select('is_pro')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return res.status(500).json({ error: 'Errore interno' })
  return res.json({ allowed: data?.is_pro ?? false })
}

// POST /api/import — merge incrementale acquisti da broker
async function handleImport(adminClient, userId, req, res) {
  const { data: cfg } = await adminClient
    .from('config')
    .select('is_pro')
    .eq('user_id', userId)
    .maybeSingle()

  if (!cfg?.is_pro) return res.status(403).json({ error: 'Piano PRO richiesto' })

  const payload = req.body
  if (!Array.isArray(payload?.etf) || !payload?.broker_id) {
    return res.status(400).json({ error: 'Payload non valido: campi broker_id e etf[] richiesti' })
  }

  const syncSource = payload.sync_source ?? 'ui_upload'
  let rowsTotal = 0, rowsInserted = 0, rowsSkipped = 0, errorMessage = null

  try {
    // Verifica ownership del broker
    const { data: brokerRow } = await adminClient
      .from('broker')
      .select('id')
      .eq('id', payload.broker_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (!brokerRow) return res.status(400).json({ error: 'Broker non trovato o non autorizzato' })
    const brokerId = brokerRow.id

    // Precarica asset class → map nome→id (evita N+1 per i nuovi ETF)
    const { data: acRows } = await adminClient.from('asset_class').select('id, nome')
    const acMap = Object.fromEntries((acRows ?? []).map(ac => [ac.nome, ac.id]))
    const defaultAcId = acMap['Azioni'] ?? Object.values(acMap)[0] ?? null

    for (const etfPayload of payload.etf) {
      if (!etfPayload.isin) continue

      // SELECT ETF esistente per non sovrascrivere importo_fisso, prezzo_corrente, archiviato
      const { data: existingEtf } = await adminClient
        .from('etf')
        .select('id, archiviato')
        .eq('user_id', userId)
        .eq('isin', etfPayload.isin)
        .maybeSingle()

      let etfId, archiviato

      if (existingEtf) {
        await adminClient
          .from('etf')
          .update({ nome: etfPayload.nome, emittente: etfPayload.emittente ?? null })
          .eq('id', existingEtf.id)
        etfId = existingEtf.id
        archiviato = existingEtf.archiviato
      } else {
        const assetClassId = acMap[etfPayload.assetClassNome] ?? defaultAcId
        const { data: newEtf, error: etfErr } = await adminClient
          .from('etf')
          .insert({
            user_id: userId,
            isin: etfPayload.isin,
            nome: etfPayload.nome,
            emittente: etfPayload.emittente ?? null,
            importo_fisso: 0,
            prezzo_corrente: 0,
            archiviato: false,
            asset_class_id: assetClassId,
          })
          .select('id')
          .single()

        if (etfErr || !newEtf) continue
        etfId = newEtf.id
        archiviato = false
      }

      const acquisti = etfPayload.acquisti ?? []
      rowsTotal += acquisti.length

      // ETF archiviato → salta tutti i suoi acquisti silenziosamente
      if (archiviato) {
        rowsSkipped += acquisti.length
        continue
      }

      for (const acquisto of acquisti) {
        if (!brokerId) {
          rowsSkipped++
          continue
        }

        // Enrichment: riga manuale corrispondente senza broker_transaction_id
        if (acquisto.broker_transaction_id) {
          const { data: manual } = await adminClient
            .from('acquisti')
            .select('id')
            .eq('etf_id', etfId)
            .eq('broker_id', brokerId)
            .eq('data', acquisto.data)
            .eq('importo_investito', acquisto.importoInvestito)
            .is('broker_transaction_id', null)
            .maybeSingle()

          if (manual) {
            await adminClient
              .from('acquisti')
              .update({ broker_transaction_id: acquisto.broker_transaction_id, sync_source: syncSource })
              .eq('id', manual.id)
            rowsSkipped++
            continue
          }
        }

        const { error: insertErr } = await adminClient.from('acquisti').insert({
          etf_id: etfId,
          user_id: userId,
          data: acquisto.data,
          importo_investito: acquisto.importoInvestito,
          prezzo_unitario: acquisto.prezzoUnitario,
          quote_frazionate: acquisto.quoteFrazionate,
          fee: acquisto.fee ?? 0,
          broker_id: brokerId,
          sync_source: syncSource,
          broker_transaction_id: acquisto.broker_transaction_id ?? null,
        })

        if (insertErr) {
          if (insertErr.code === '23505') {
            rowsSkipped++ // unique_violation → già presente
          } else {
            throw insertErr
          }
        } else {
          rowsInserted++
        }
      }
    }
  } catch (err) {
    errorMessage = err.message ?? 'Errore sconosciuto'
  }

  // Scrivi log sempre, anche in caso di errore parziale
  await adminClient.from('broker_sync_log').insert({
    user_id: userId,
    broker_id: payload.broker_id,
    source: syncSource,
    rows_total: rowsTotal,
    rows_inserted: rowsInserted,
    rows_skipped: rowsSkipped,
    error_message: errorMessage,
  })

  if (errorMessage) {
    return res.status(500).json({
      error: errorMessage,
      inserted: rowsInserted,
      skipped: rowsSkipped,
      total: rowsTotal,
    })
  }

  return res.json({ inserted: rowsInserted, skipped: rowsSkipped, total: rowsTotal })
}
