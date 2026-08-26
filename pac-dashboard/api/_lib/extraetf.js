// PAC-165: fonte unica per il fetch dei dettagli ETF da extraetf.com
// (usata sia dall'endpoint api/extraetf.js sia dall'enrichment in api/import.js)

const ASSET_CLASS_MAP = {
  2:    'Azioni',
  3:    'Obbligazioni',
  4:    'Materie prime',
  1160: 'Immobili',
  5:    'Mercato monetario',
  9:    'Portafogli di ETF',
  1240: 'Criptovalute',
}

// Interroga extraetf.com per un ISIN. Non lancia mai eccezioni: ogni esito
// (rete, HTTP, parsing, ISIN non trovato) è rappresentato nel risultato.
//
// Ritorna:
//   { ok: true,  data: { nome, emittente, assetClassNome } }
//   { ok: false, reason: 'network' | 'invalid_json' | 'not_found', status?: number }
export async function fetchExtraEtfDetail(isin) {
  const targetUrl = `https://extraetf.com/api-v2/detail/?isin=${isin}&extraetf_locale=it`

  let response
  try {
    response = await fetch(targetUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer':         'https://extraetf.com/',
        'Origin':          'https://extraetf.com',
      },
    })
  } catch (_) {
    return { ok: false, reason: 'network' }
  }

  if (!response.ok) return { ok: false, reason: 'not_found', status: response.status }

  let json
  try {
    json = await response.json()
  } catch (_) {
    return { ok: false, reason: 'invalid_json' }
  }

  const etf = Array.isArray(json.results) ? json.results[0] : json
  if (!etf) return { ok: false, reason: 'not_found', status: 404 }

  const emittente = etf.shortname || ''
  const fondname = etf.fondname || ''
  const nome = emittente && fondname.startsWith(emittente)
    ? fondname.slice(emittente.length).trimStart()
    : fondname
  const assetClassId = etf.asset_class ?? etf.asset_class_id ?? null
  const assetClassNome = assetClassId ? (ASSET_CLASS_MAP[assetClassId] ?? 'Azioni') : 'Azioni'

  return { ok: true, data: { nome, emittente, assetClassNome } }
}
