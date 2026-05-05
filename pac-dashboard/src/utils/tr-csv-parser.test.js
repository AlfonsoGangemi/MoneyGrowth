import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { parseCsvRows, parseTrCsvToBackup, enrichEtfsFromExtraETF, fetchEtfInfoFromExtraETF } from './tr-csv-parser.js';

// ── Fixture inline ─────────────────────────────────────────────────────────────
// Sottoinsieme minimo: 1 BUY, 1 SELL ipotetico, 1 trasferimento (da filtrare), 1 tassa (da filtrare)
const FIXTURE_CSV = `"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency","original_amount","original_currency","fx_rate","description","transaction_id","counterparty_name","counterparty_iban","payment_reference","mcc_code"
"2026-02-16T08:41:19.932Z","2026-02-16","DEFAULT","TRADING","BUY","FUND","S&P 500 USD (Acc)","IE00BFMXXD54","0.9020790000","110.8550000000","-100.00","","","EUR","","","","Savings plan execution","51c72478-e38a-4c43-81cd-91069431502f","","","",""
"2026-03-16T10:56:18.000Z","2026-03-16","DEFAULT","TRADING","BUY","FUND","S&P 500 USD (Acc)","IE00BFMXXD54","0.8897190000","112.3950000000","-100.00","","","EUR","","","","Savings plan execution","e4da4104-2174-429e-b6b4-6328254d10e4","","","",""
"2026-04-01T09:00:00.000Z","2026-04-01","DEFAULT","TRADING","SELL","FUND","S&P 500 USD (Acc)","IE00BFMXXD54","-0.5000000000","115.0000000000","57.50","","","EUR","","","","Manual sell","aabbccdd-0000-0000-0000-000000000001","","","",""
"2026-02-14T08:00:26.000Z","2026-02-14","DEFAULT","CASH","TRANSFER_INSTANT_INBOUND","","","","","","400.000000","","","EUR","","","","Incoming transfer","019c5b2a-51cd-7fe5-bb01-fbb28be8b706","","","",""
"2026-04-09T09:31:49.000Z","2026-04-09","DEFAULT","CASH","TAX_OPTIMIZATION","","","","","","0.000000","","-0.30","EUR","","","","Stamp Duty Tax","019d7195-6593-79f8-b497-991f9d558bd3","","","",""
"2026-02-16T09:21:04.000Z","2026-02-16","DEFAULT","TRADING","BUY","FUND","Euro Corp Bond EUR (Acc)","LU0478205379","1.2183600000","164.1550000000","-200.00","","","EUR","","","","Savings plan execution","b313ae19-98f8-41e8-b112-373f83732a52","","","",""`

// ── File CSV reale (spike PAC-140) ─────────────────────────────────────────────
const REAL_CSV_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../scripts/samples/tr-export.csv',
);
const realCsv = readFileSync(REAL_CSV_PATH, 'utf8');

// ── Helper: verifica conformità schema etflens-backup.schema.json ──────────────
function assertBackupSchema(backup) {
  // radice
  expect(backup).toHaveProperty('etf');
  expect(backup).toHaveProperty('broker');
  expect(backup).toHaveProperty('orizzonteAnni');
  expect(Array.isArray(backup.etf)).toBe(true);
  expect(Array.isArray(backup.broker)).toBe(true);
  expect(Number.isInteger(backup.orizzonteAnni)).toBe(true);

  // broker
  for (const b of backup.broker) {
    expect(typeof b.nome).toBe('string');
    expect(b.colore).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(typeof b.archiviato).toBe('boolean');
  }

  // etf
  for (const etf of backup.etf) {
    expect(typeof etf.nome).toBe('string');
    expect(typeof etf.isin).toBe('string');
    expect(typeof etf.emittente).toBe('string');
    expect(typeof etf.importoFisso).toBe('number');
    expect(typeof etf.prezzoCorrente).toBe('number');
    expect(typeof etf.archiviato).toBe('boolean');
    expect(Array.isArray(etf.acquisti)).toBe(true);

    // acquisti
    for (const a of etf.acquisti) {
      expect(a.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof a.importoInvestito).toBe('number');
      expect(a.importoInvestito).not.toBe(0);
      expect(typeof a.prezzoUnitario).toBe('number');
      expect(typeof a.quoteFrazionate).toBe('number');
      expect(a.quoteFrazionate).not.toBe(0);
      expect(typeof a.fee).toBe('number');
      expect(typeof a.brokerNome).toBe('string');
    }
  }
}

// ── parseCsvRows ───────────────────────────────────────────────────────────────
describe('parseCsvRows', () => {
  it('produce tante righe quante le righe dati (esclusa intestazione)', () => {
    const rows = parseCsvRows(FIXTURE_CSV);
    expect(rows).toHaveLength(6);
  });

  it('mappa correttamente le chiavi di intestazione', () => {
    const [first] = parseCsvRows(FIXTURE_CSV);
    expect(first).toHaveProperty('datetime');
    expect(first).toHaveProperty('date');
    expect(first).toHaveProperty('symbol');
    expect(first).toHaveProperty('transaction_id');
    expect(first).toHaveProperty('amount');
  });

  it('gestisce virgole interne ai campi quotati', () => {
    const csv = `"a","b","c"\n"foo, bar","baz","qux"`;
    const [row] = parseCsvRows(csv);
    expect(row.a).toBe('foo, bar');
    expect(row.b).toBe('baz');
  });

  it('gestisce doppi apici escaped ("")', () => {
    const csv = `"a","b"\n"say ""hello""","world"`;
    const [row] = parseCsvRows(csv);
    expect(row.a).toBe('say "hello"');
  });

  it('ignora righe vuote in fondo', () => {
    const rows = parseCsvRows(FIXTURE_CSV + '\n\n');
    expect(rows).toHaveLength(6);
  });
});

// ── parseTrCsvToBackup — filtro righe ─────────────────────────────────────────
describe('parseTrCsvToBackup — filtro', () => {
  it('include solo righe TRADING/BUY e TRADING/SELL', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const totaleAcquisti = backup.etf.reduce((s, e) => s + e.acquisti.length, 0);
    expect(totaleAcquisti).toBe(4); // 2 BUY SP500 + 1 SELL SP500 + 1 BUY EuroCorp
  });

  it('esclude righe CASH (trasferimenti, tasse)', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    // nessun ETF con isin vuoto
    expect(backup.etf.every(e => e.isin.length > 0)).toBe(true);
  });
});

// ── parseTrCsvToBackup — raggruppamento per ISIN ──────────────────────────────
describe('parseTrCsvToBackup — raggruppamento ISIN', () => {
  it('raggruppa acquisti dello stesso ETF in un unico oggetto', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const sp500 = backup.etf.find(e => e.isin === 'IE00BFMXXD54');
    expect(sp500).toBeDefined();
    expect(sp500.acquisti).toHaveLength(3); // 2 BUY + 1 SELL
  });

  it('crea ETF distinti per ISIN diversi', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    expect(backup.etf).toHaveLength(2); // SP500 + EuroCorp
  });
});

// ── parseTrCsvToBackup — mapping campi ────────────────────────────────────────
describe('parseTrCsvToBackup — mapping campi', () => {
  it('importoInvestito = -amount (BUY: amount negativo → valore positivo)', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const sp500 = backup.etf.find(e => e.isin === 'IE00BFMXXD54');
    const buy = sp500.acquisti.find(a => a.tr_transaction_id === '51c72478-e38a-4c43-81cd-91069431502f');
    expect(buy.importoInvestito).toBe(100);
  });

  it('importoInvestito negativo per SELL (amount positivo → valore negativo)', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const sp500 = backup.etf.find(e => e.isin === 'IE00BFMXXD54');
    const sell = sp500.acquisti.find(a => a.tr_transaction_id === 'aabbccdd-0000-0000-0000-000000000001');
    expect(sell.importoInvestito).toBe(-57.5);
  });

  it('quoteFrazionate negativo per SELL', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const sp500 = backup.etf.find(e => e.isin === 'IE00BFMXXD54');
    const sell = sp500.acquisti.find(a => a.tr_transaction_id === 'aabbccdd-0000-0000-0000-000000000001');
    expect(sell.quoteFrazionate).toBe(-0.5);
  });

  it('prezzoUnitario è un numero positivo', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    for (const etf of backup.etf)
      for (const a of etf.acquisti)
        expect(a.prezzoUnitario).toBeGreaterThan(0);
  });

  it('data è nel formato YYYY-MM-DD', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const buy = backup.etf[0].acquisti[0];
    expect(buy.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('fee è 0 quando assente nel CSV', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    for (const etf of backup.etf)
      for (const a of etf.acquisti)
        expect(a.fee).toBe(0);
  });

  it('brokerNome è sempre "Trade Republic"', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    for (const etf of backup.etf)
      for (const a of etf.acquisti)
        expect(a.brokerNome).toBe('Trade Republic');
  });

  it('tr_transaction_id è l\'UUID della colonna transaction_id', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const sp500 = backup.etf.find(e => e.isin === 'IE00BFMXXD54');
    const buy = sp500.acquisti[0];
    expect(buy.tr_transaction_id).toBe('51c72478-e38a-4c43-81cd-91069431502f');
  });

  it('isin corrisponde alla colonna symbol (che contiene l\'ISIN)', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    expect(backup.etf.map(e => e.isin).sort()).toEqual(['IE00BFMXXD54', 'LU0478205379'].sort());
  });

  it('nome ETF corrisponde alla colonna name', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    const sp500 = backup.etf.find(e => e.isin === 'IE00BFMXXD54');
    expect(sp500.nome).toBe('S&P 500 USD (Acc)');
  });
});

// ── parseTrCsvToBackup — broker ────────────────────────────────────────────────
describe('parseTrCsvToBackup — broker', () => {
  it('produce esattamente un broker "Trade Republic"', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    expect(backup.broker).toHaveLength(1);
    expect(backup.broker[0].nome).toBe('Trade Republic');
  });

  it('colore broker è un hex valido', () => {
    const backup = parseTrCsvToBackup(FIXTURE_CSV);
    expect(backup.broker[0].colore).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

// ── parseTrCsvToBackup — conformità schema ────────────────────────────────────
describe('parseTrCsvToBackup — conformità schema etflens-backup.schema.json', () => {
  it('fixture: output rispetta lo schema', () => {
    assertBackupSchema(parseTrCsvToBackup(FIXTURE_CSV));
  });

  it('CSV reale (tr-export.csv): output rispetta lo schema', () => {
    assertBackupSchema(parseTrCsvToBackup(realCsv));
  });

  it('CSV reale: contiene solo righe BUY (nessun SELL nel campione)', () => {
    const backup = parseTrCsvToBackup(realCsv);
    for (const etf of backup.etf)
      for (const a of etf.acquisti)
        expect(a.importoInvestito).toBeGreaterThan(0);
  });

  it('CSV reale: 3 ETF distinti presenti', () => {
    const backup = parseTrCsvToBackup(realCsv);
    expect(backup.etf).toHaveLength(3);
  });

  it('CSV reale: 8 acquisti totali (LU0908500753×3 + LU0478205379×3 + IE00BFMXXD54×2)', () => {
    const backup = parseTrCsvToBackup(realCsv);
    const tot = backup.etf.reduce((s, e) => s + e.acquisti.length, 0);
    expect(tot).toBe(8);
  });

  it('CSV reale: orizzonteAnni passato come opzione', () => {
    const backup = parseTrCsvToBackup(realCsv, { orizzonteAnni: 10 });
    expect(backup.orizzonteAnni).toBe(10);
  });
});

// ── fetchEtfInfoFromExtraETF ───────────────────────────────────────────────────
describe('fetchEtfInfoFromExtraETF', () => {
  beforeEach(() => vi.restoreAllMocks());

  const VANGUARD_FIXTURE = {
    fondname: 'Vanguard S&P 500 UCITS ETF (USD) Accumulating',
    shortname: 'Vanguard',
    asset_class: 2,
  };

  it('ritorna null su errore di rete', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));
    expect(await fetchEtfInfoFromExtraETF('IE00BFMXXD54')).toBeNull();
  });

  it('ritorna null se ExtraETF risponde non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    expect(await fetchEtfInfoFromExtraETF('IE00BFMXXD54')).toBeNull();
  });

  it('ritorna null se il risultato è vuoto', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    }));
    expect(await fetchEtfInfoFromExtraETF('IE00BFMXXD54')).toBeNull();
  });

  it('mappa correttamente fondname/shortname/asset_class (risposta diretta)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => VANGUARD_FIXTURE,
    }));
    const info = await fetchEtfInfoFromExtraETF('IE00BFMXXD54');
    expect(info).toEqual({
      nome: 'S&P 500 UCITS ETF (USD) Accumulating',
      emittente: 'Vanguard',
      assetClassNome: 'Azioni',
    });
  });

  it('mappa correttamente risultati in array (json.results)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [VANGUARD_FIXTURE] }),
    }));
    const info = await fetchEtfInfoFromExtraETF('IE00BFMXXD54');
    expect(info.emittente).toBe('Vanguard');
    expect(info.nome).toBe('S&P 500 UCITS ETF (USD) Accumulating');
  });

  it('asset_class sconosciuto → default Azioni', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ...VANGUARD_FIXTURE, asset_class: 9999 }),
    }));
    const info = await fetchEtfInfoFromExtraETF('IE00BFMXXD54');
    expect(info.assetClassNome).toBe('Azioni');
  });

  it('tutte le asset class note sono mappate', async () => {
    const cases = [
      [2, 'Azioni'], [3, 'Obbligazioni'], [4, 'Materie prime'],
      [1160, 'Immobili'], [5, 'Mercato monetario'], [9, 'Portafogli di ETF'], [1240, 'Criptovalute'],
    ];
    for (const [id, atteso] of cases) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...VANGUARD_FIXTURE, asset_class: id }),
      }));
      const info = await fetchEtfInfoFromExtraETF('IE00BFMXXD54');
      expect(info.assetClassNome, `asset_class ${id}`).toBe(atteso);
    }
  });

  it('chiama ExtraETF con ISIN e locale it nella URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => VANGUARD_FIXTURE,
    });
    vi.stubGlobal('fetch', mockFetch);
    await fetchEtfInfoFromExtraETF('IE00BFMXXD54');
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain('isin=IE00BFMXXD54');
    expect(url).toContain('extraetf_locale=it');
  });
});

// ── enrichEtfsFromExtraETF ────────────────────────────────────────────────────
describe('enrichEtfsFromExtraETF', () => {
  beforeEach(() => vi.restoreAllMocks());

  function makeEtfs() {
    return [
      { isin: 'IE00BFMXXD54', nome: 'S&P 500 USD (Acc)', emittente: '', assetClassNome: 'Fondi', acquisti: [] },
      { isin: 'LU0478205379', nome: 'Euro Corp Bond EUR (Acc)', emittente: '', assetClassNome: 'Fondi', acquisti: [] },
    ];
  }

  it('sovrascrive nome, emittente e assetClassNome con i dati ExtraETF', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        fondname: 'Vanguard S&P 500 UCITS ETF Accumulating',
        shortname: 'Vanguard',
        asset_class: 2,
      }),
    }));
    const etfs = makeEtfs();
    await enrichEtfsFromExtraETF(etfs);
    expect(etfs[0].emittente).toBe('Vanguard');
    expect(etfs[0].nome).toBe('S&P 500 UCITS ETF Accumulating');
    expect(etfs[0].assetClassNome).toBe('Azioni');
  });

  it('chiama ExtraETF in parallelo (una chiamata per ISIN)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ fondname: 'X', shortname: 'Y', asset_class: 2 }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const etfs = makeEtfs();
    await enrichEtfsFromExtraETF(etfs);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('mantiene i valori CSV se ExtraETF fallisce (errore di rete)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network fail')));
    const etfs = makeEtfs();
    await enrichEtfsFromExtraETF(etfs);
    expect(etfs[0].nome).toBe('S&P 500 USD (Acc)');
    expect(etfs[0].emittente).toBe('');
    expect(etfs[0].assetClassNome).toBe('Fondi');
  });

  it('mantiene i valori CSV se ExtraETF risponde non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const etfs = makeEtfs();
    await enrichEtfsFromExtraETF(etfs);
    expect(etfs[0].nome).toBe('S&P 500 USD (Acc)');
  });

  it('arricchisce solo gli ETF per cui ExtraETF risponde correttamente (fallback parziale)', async () => {
    let callCount = 0;
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({
        ok: true,
        json: async () => ({ fondname: 'Vanguard S&P 500 UCITS ETF', shortname: 'Vanguard', asset_class: 2 }),
      });
      return Promise.resolve({ ok: false, status: 404 });
    }));
    const etfs = makeEtfs();
    await enrichEtfsFromExtraETF(etfs);
    expect(etfs[0].emittente).toBe('Vanguard');
    expect(etfs[1].emittente).toBe(''); // fallback
  });

  it('ritorna lo stesso array (mutazione in-place)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fail')));
    const etfs = makeEtfs();
    const result = await enrichEtfsFromExtraETF(etfs);
    expect(result).toBe(etfs);
  });
});
