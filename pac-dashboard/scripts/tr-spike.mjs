/**
 * Spike PAC-140 — Test locale connessione Trade Republic + lettura ordini
 *
 * Auth flow reale (da reverse engineering NightOwl07/trade-republic-api):
 *   1. GET WAF token: apri app.traderepublic.com → DevTools Console →
 *        await window.AwsWafIntegration.getToken()
 *      e incolla il risultato in TR_WAF_TOKEN (o setta la variabile d'ambiente)
 *   2. POST /api/v1/auth/web/login  con header X-aws-waf-token
 *   3. Inserisci il codice ricevuto (TAN / device pin)
 *   4. POST /api/v1/auth/web/login/{processId}/{code}  → cookie tr_session
 *   5. WS connect 34 {"locale":"it"}  con Cookie header
 *   6. Subscription timelineTransactions / timelineActivityLog
 *
 * ESECUZIONE (dalla cartella pac-dashboard):
 *   TR_WAF_TOKEN="xxx" node scripts/tr-spike.mjs
 */

import readline from 'readline';

// ── Configurazione ────────────────────────────────────────────────────────────
const PHONE     = process.env.TR_PHONE     ?? '+393282870223';
const PIN       = process.env.TR_PIN       ?? '1404';
const WAF_TOKEN = process.env.TR_WAF_TOKEN ?? ''; // ← incolla qui o passa come env
const TR_BASE   = 'https://api.traderepublic.com';
const TR_WS     = 'wss://api.traderepublic.com';

if (!WAF_TOKEN) {
  console.error('⚠ TR_WAF_TOKEN non impostato.');
  console.error('  Apri https://app.traderepublic.com → DevTools Console:');
  console.error('    await window.AwsWafIntegration.getToken()');
  console.error('  Poi esegui: TR_WAF_TOKEN="xxx" node scripts/tr-spike.mjs');
  process.exit(1);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

// ── Step 1: Auth HTTP con WAF token ──────────────────────────────────────────
async function authenticate() {
  console.log('── STEP 1: Autenticazione HTTP ─────────────────────────');

  const baseHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-aws-waf-token': WAF_TOKEN,
    'Origin': 'https://app.traderepublic.com',
    'Referer': 'https://app.traderepublic.com/',
  };

  // POST /api/v1/auth/web/login
  const initRes = await fetch(`${TR_BASE}/api/v1/auth/web/login`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ phoneNumber: PHONE, pin: PIN }),
  });

  const initText = await initRes.text();
  console.log(`  HTTP ${initRes.status} — body: ${initText.slice(0, 300) || '(vuoto)'}`);

  let initData;
  try { initData = JSON.parse(initText); } catch {
    throw new Error(`Risposta non-JSON (${initRes.status}): ${initText.slice(0, 200) || '(body vuoto)'}`);
  }

  if (!initRes.ok) {
    const err = initData.errors?.[0];
    if (err?.errorCode === 'TOO_MANY_REQUESTS') {
      throw new Error(`Rate limited. Riprova tra ${err.meta?.nextAttemptInSeconds ?? 60}s`);
    }
    throw new Error(`Auth fallita: ${err?.errorCode ?? initRes.statusText}`);
  }

  const { processId, '2fa': method, countdownInSeconds } = initData;
  console.log(`  ✓ processId: ${processId}, metodo: ${method}, countdown: ${countdownInSeconds}s`);

  const code = await prompt('Inserisci il codice ricevuto (4 cifre): ');
  if (!/^\d{4}$/.test(code)) throw new Error('Il codice deve essere esattamente 4 cifre');

  // POST /api/v1/auth/web/login/{processId}/{code}
  const tanUrl = `${TR_BASE}/api/v1/auth/web/login/${processId}/${code}`;
  console.log(`  → POST ${tanUrl}`);
  const tanRes = await fetch(tanUrl, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({}),
    redirect: 'manual',
  });

  const tanText = await tanRes.text();
  console.log(`  HTTP ${tanRes.status} — body: ${tanText.slice(0, 300) || '(vuoto)'}`);

  // Estrai cookie tr_session dalla risposta
  const setCookie = tanRes.headers.get('set-cookie') ?? '';
  console.log(`  set-cookie: ${setCookie.slice(0, 200) || '(nessuno)'}`);

  // Prova anche a parsare JSON per accessToken (fallback)
  let accessToken = null;
  try {
    const tanData = JSON.parse(tanText);
    accessToken = tanData.accessToken ?? tanData.sessionToken ?? null;
  } catch { /* body potrebbe essere vuoto se la sessione è solo cookie */ }

  // Costruisci cookie string per il WebSocket
  const cookieStr = setCookie
    .split(',')
    .map(c => c.split(';')[0].trim())
    .filter(c => c)
    .join('; ');

  if (!cookieStr && !accessToken) {
    throw new Error('Nessun cookie né token ricevuto dopo 2FA — controllare il codice o il WAF token');
  }

  console.log(`  ✓ Autenticazione completata — cookie: ${cookieStr.slice(0, 80) || '(vuoto)'}, token: ${accessToken ? 'sì' : 'no'}\n`);
  return { cookieStr, accessToken };
}

// ── Step 2: WebSocket con sessione ────────────────────────────────────────────
async function runWebSocket({ cookieStr, accessToken }) {
  console.log('── STEP 2: WebSocket — subscription ordini / timeline ───');

  const { default: WebSocket } = await import('ws');

  const wsHeaders = { 'Origin': 'https://app.traderepublic.com' };
  if (cookieStr) wsHeaders['Cookie'] = cookieStr;

  return new Promise((resolve) => {
    const ws = new WebSocket(TR_WS, { headers: wsHeaders });

    let nextSub = 1;
    const subs = {};
    let authenticated = false;

    function send(msg) {
      console.log(`  → ${msg.slice(0, 200)}`);
      ws.send(msg);
    }

    function startSubscriptions() {
      console.log('\n  ✓ Sessione WS attiva — invio subscription ordini\n');
      const types = [
        'timelineTransactions',
        'timelineActivityLog',
        'timelineActionsV2',
        'orders',
        'cashAccountTransactions',
      ];
      for (const type of types) {
        const id = nextSub++;
        subs[id] = type;
        // Se abbiamo accessToken, includiamolo nel payload
        const payload = accessToken ? { type, token: accessToken } : { type };
        send(`sub ${id} ${JSON.stringify(payload)}`);
      }

      setTimeout(() => {
        ws.close();
        console.log('\n  ✓ WS chiuso dopo 15s');
        console.log('\n  Riepilogo subscription:');
        for (const [id, type] of Object.entries(subs)) {
          if (!type.startsWith('__')) {
            console.log(`    ${type}: ${subs[`got:${id}`] ? 'dati ricevuti ✓' : 'nessun dato ✗'}`);
          }
        }
        resolve();
      }, 15000);
    }

    ws.on('open', () => {
      console.log('  ✓ WebSocket connesso');
      // Protocollo WS TR versione 34 (da NightOwl07)
      send(`connect 34 ${JSON.stringify({ locale: 'it' })}`);
    });

    ws.on('message', (raw) => {
      const msg = raw.toString();
      console.log(`  ← ${msg.slice(0, 300)}`);

      if (msg === 'connected') {
        authenticated = true;
        startSubscriptions();
        return;
      }

      // Parsa "N <payload>"
      const spaceIdx = msg.indexOf(' ');
      if (spaceIdx < 0) return;
      const id = Number(msg.slice(0, spaceIdx));
      const type = subs[id];
      if (!type) return;

      subs[`got:${id}`] = true;
      try {
        const data = JSON.parse(msg.slice(spaceIdx + 1));
        console.log(`\n  ═══ Dati "${type}" (sub ${id}):`);
        console.log(JSON.stringify(data, null, 2).slice(0, 1200));
      } catch { /* raw non-JSON */ }
    });

    ws.on('error', (e) => {
      console.error(`  ✗ WS errore: ${e.message}`);
      resolve();
    });

    ws.on('close', (code) => {
      if (!authenticated) console.log(`  WS chiuso prima di "connected" (code ${code})`);
    });
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Spike PAC-140: Test Trade Republic ===\n');
  const t0 = Date.now();

  const session = await authenticate();
  await runWebSocket(session);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n── Completato in ${elapsed}s ────────────────────────────`);
  console.log(Number(elapsed) > 60
    ? '⚠ Tempo > 60s: rischio timeout Vercel serverless'
    : '✓ Compatibile con timeout Vercel (< 60s)');
  console.log('\nCosa fare con l\'output:');
  console.log('  1. Identificare quale subscription restituisce gli ordini eseguiti');
  console.log('  2. Copiare la struttura raw in PAC-133 (Implementation Notes)');
  console.log('  3. Aggiornare il mapping campo-TR → campo DB (acquisti)');
}

main().catch(e => { console.error('\nERRORE:', e.message); process.exit(1); });
