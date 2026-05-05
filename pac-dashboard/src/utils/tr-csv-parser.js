/**
 * Parser CSV Trade Republic → formato backup ETFLens
 *
 * Formato CSV atteso (da spike PAC-140):
 *   - Encoding: UTF-8, separatore: virgola, tutti i valori tra doppi apici
 *   - Campo `symbol` contiene l'ISIN (nonostante il nome)
 *   - Campo `amount` è negativo per BUY, positivo per SELL
 *   - Campo `transaction_id` è UUID v7 → chiave dedup primaria
 *
 * Output: oggetto compatibile con etflens-backup.schema.json,
 *   esteso con `tr_transaction_id` per acquisto (campo extra, non nel schema base).
 */

// Stessa mappa presente in api/extraetf-detail.js
const ASSET_CLASS_MAP = {
  2:    'Azioni',
  3:    'Obbligazioni',
  4:    'Materie prime',
  1160: 'Immobili',
  5:    'Mercato monetario',
  9:    'Portafogli di ETF',
  1240: 'Criptovalute',
};

const EXTRAETF_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9',
  'Referer': 'https://extraetf.com/',
  'Origin': 'https://extraetf.com',
};

/**
 * Parsa una riga CSV con campi tra doppi apici.
 * Gestisce virgole interne ai campi quotati e doppi apici escaped ("").
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let val = '';
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') {
          val += '"';
          i += 2;
        } else if (line[i] === '"') {
          i++;
          break;
        } else {
          val += line[i++];
        }
      }
      fields.push(val);
      if (line[i] === ',') i++;
    } else {
      let val = '';
      while (i < line.length && line[i] !== ',') val += line[i++];
      fields.push(val);
      if (line[i] === ',') i++;
    }
  }
  return fields;
}

/**
 * Converte testo CSV TR in array di oggetti con chiavi intestazione.
 * @param {string} csvText
 * @returns {Record<string, string>[]}
 */
export function parseCsvRows(csvText) {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((h, idx) => [h, values[idx] ?? '']));
    });
}

/**
 * Trasforma il CSV esportato da Trade Republic nel formato backup ETFLens.
 *
 * @param {string} csvText - Contenuto grezzo del file CSV
 * @param {object} [options]
 * @param {number} [options.orizzonteAnni=0] - Anni orizzonte da scrivere nel backup
 * @returns {{ etf: object[], broker: object[], orizzonteAnni: number }}
 */
export function parseTrCsvToBackup(csvText, { orizzonteAnni = 0 } = {}) {
  const rows = parseCsvRows(csvText);

  const tradingRows = rows.filter(
    r => r.category === 'TRADING' && (r.type === 'BUY' || r.type === 'SELL'),
  );

  /** @type {Map<string, { nome: string, isin: string, emittente: string, importoFisso: number, prezzoCorrente: number, archiviato: boolean, assetClassNome: string, acquisti: object[] }>} */
  const etfMap = new Map();

  for (const row of tradingRows) {
    const isin = row.symbol;
    if (!etfMap.has(isin)) {
      etfMap.set(isin, {
        nome: row.name,
        isin,
        emittente: '',
        importoFisso: 0,
        prezzoCorrente: 0,
        archiviato: false,
        assetClassNome: row.asset_class === 'FUND' ? 'Fondi' : row.asset_class,
        acquisti: [],
      });
    }

    const etf = etfMap.get(isin);
    etf.acquisti.push({
      data: row.date,
      importoInvestito: -parseFloat(row.amount),
      prezzoUnitario: parseFloat(row.price),
      quoteFrazionate: parseFloat(row.shares),
      fee: parseFloat(row.fee) || 0,
      brokerNome: 'Trade Republic',
      tr_transaction_id: row.transaction_id,
    });
  }

  return {
    etf: Array.from(etfMap.values()),
    broker: [{ nome: 'Trade Republic', colore: '#ffa500', archiviato: false }],
    orizzonteAnni,
  };
}

/**
 * Recupera da ExtraETF le info mancanti (nome completo, emittente, asset class)
 * per un singolo ISIN. Ritorna null se la richiesta fallisce.
 *
 * @param {string} isin
 * @returns {Promise<{ nome: string, emittente: string, assetClassNome: string } | null>}
 */
export async function fetchEtfInfoFromExtraETF(isin) {
  try {
    const res = await fetch(
      `https://extraetf.com/api-v2/detail/?isin=${isin}&extraetf_locale=it`,
      { headers: EXTRAETF_HEADERS },
    );
    if (!res.ok) return null;

    const json = await res.json();
    const etf = Array.isArray(json.results) ? json.results[0] : json;
    if (!etf) return null;

    const emittente = etf.shortname || '';
    const fondname = etf.fondname || '';
    const nome = emittente && fondname.startsWith(emittente)
      ? fondname.slice(emittente.length).trimStart()
      : fondname;
    const assetClassId = etf.asset_class ?? etf.asset_class_id ?? null;
    const assetClassNome = assetClassId
      ? (ASSET_CLASS_MAP[assetClassId] ?? 'Azioni')
      : 'Azioni';

    return { nome, emittente, assetClassNome };
  } catch {
    return null;
  }
}

/**
 * Arricchisce in-place ogni ETF del backup con i dati ExtraETF.
 * Le chiamate sono in parallelo. Se ExtraETF non risponde per un ISIN,
 * i valori originali (dal CSV) vengono mantenuti.
 *
 * @param {object[]} etfs - Array ETF prodotto da parseTrCsvToBackup
 * @returns {Promise<object[]>} Lo stesso array, mutato in-place
 */
export async function enrichEtfsFromExtraETF(etfs) {
  await Promise.all(etfs.map(async (etf) => {
    const info = await fetchEtfInfoFromExtraETF(etf.isin);
    if (!info) return;
    if (info.nome)         etf.nome         = info.nome;
    if (info.emittente)    etf.emittente    = info.emittente;
    if (info.assetClassNome) etf.assetClassNome = info.assetClassNome;
  }));
  return etfs;
}
