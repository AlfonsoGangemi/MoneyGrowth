/**
 * Uso: node build_storico_prezzi_from_degiro_graph.mjs <isin> <yyyy-mm-dd> <'[[0,24.92],...]'>
 * Appende i risultati in prices.csv (isin,anno,mese,prezzo)
 */
import { appendFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

/**
 * @param {string} startDate - Data di partenza in formato yyyy-mm-dd
 * @param {Array<[number, number]>} data - Array di coppie [offsetGiorni, valore]
 * @returns {Array<{anno: number, mese: number, offset: number, valore: number}>}
 */
function valoriUltimoGiornoMese(startDate, data) {
  const start = new Date(startDate + "T00:00:00");

  // Costruisce una Map offset → valore per lookup rapido
  const map = new Map(data.map(([g, v]) => [g, v]));
  const offsets = data.map(([g]) => g).sort((a, b) => a - b);
  const maxOffset = offsets[offsets.length - 1];

  // Trova il valore per un dato offset:
  // usa il valore esatto se presente, altrimenti il più recente disponibile
  function trovaPiùVicino(targetOffset) {
    if (map.has(targetOffset)) return map.get(targetOffset);
    let found = null;
    for (const o of offsets) {
      if (o <= targetOffset) found = o;
      else break;
    }
    return found !== null ? map.get(found) : null;
  }

  const risultati = [];

  // Itera mese per mese a partire dal mese della data di partenza
  let anno = start.getFullYear();
  let mese = start.getMonth(); // 0-based

  while (true) {
    // Ultimo giorno del mese corrente (giorno 0 del mese successivo)
    const ultimoGiorno = new Date(anno, mese + 1, 0);
    ultimoGiorno.setHours(0, 0, 0, 0);

    const offsetGiorni = Math.round((ultimoGiorno - start) / (1000 * 60 * 60 * 24));

    if (offsetGiorni > maxOffset) break;

    const valore = trovaPiùVicino(offsetGiorni);
    if (valore !== null) {
      risultati.push({ anno, mese: mese + 1, offset: offsetGiorni, valore });
    }

    // Mese successivo
    mese++;
    if (mese > 11) {
      mese = 0;
      anno++;
    }
  }

  return risultati;
}

// ── CLI ───────────────────────────────────────────────────────────────────────
const [,, isin, startDate, rawData] = process.argv;

if (!isin || !startDate || !rawData) {
  console.error("Uso: node build_storico_prezzi_from_degiro_graph.mjs <isin> <yyyy-mm-dd> <'[[0,24.92],[1,24.23],...]'>");
  process.exit(1);
}

const data = JSON.parse(rawData);
const risultati = valoriUltimoGiornoMese(startDate, data);

const csvPath = join(dirname(fileURLToPath(import.meta.url)), "prices.csv");
if (!existsSync(csvPath)) appendFileSync(csvPath, "isin,anno,mese,prezzo\n");
for (const { anno, mese, valore } of risultati) {
  appendFileSync(csvPath, `${isin},${anno},${mese},${valore}\n`);
}
console.log(`Scritte ${risultati.length} righe in prices.csv`);

export { valoriUltimoGiornoMese };
