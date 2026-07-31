import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { KNOWN_ROUTES, NOT_FOUND_ROUTE } from '../src/utils/routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const template = await fs.readFile(path.join(root, 'dist/index.html'), 'utf-8')
const { render } = await import(pathToFileURL(path.join(root, 'dist-server/entry-server.js')).href)

const SITE = 'https://etflens.app'

// Metadati per rotta: senza questi ogni pagina eredita il canonical della home
// e Google la scarta come duplicato.
//
// `out` è il file generato in dist/. Ogni rotta client-side va aggiunta qui,
// altrimenti riceve il markup della home e l'idratazione fallisce.
const routes = {
  '/': {
    out: 'index.html',
    title: 'ETF Lens — Tracker gratuito per portafoglio ETF e PAC',
    description: 'ETF Lens: traccia il tuo portafoglio ETF e piano di accumulo (PAC), calcola rendimento reale, CAGR e proietta la crescita futura. Gratis, sicuro, senza pubblicità.',
    canonical: SITE,
  },
  '/privacy': {
    out: 'privacy/index.html',
    title: 'Privacy Policy — ETF Lens',
    description: 'Informativa privacy di ETF Lens: dati raccolti, finalità del trattamento, conservazione, condivisione con terze parti e i tuoi diritti ai sensi del GDPR.',
    canonical: `${SITE}/privacy`,
  },
  '/termini': {
    out: 'termini/index.html',
    title: 'Termini di Servizio — ETF Lens',
    description: "Termini di servizio di ETF Lens: condizioni d'uso, account, limitazioni di responsabilità e disclaimer sugli strumenti di analisi del portafoglio ETF.",
    canonical: `${SITE}/termini`,
  },
  // Pagina di consenso OAuth: prerenderizzata per evitare che il rewrite le serva
  // il markup della landing, che romperebbe l'idratazione di `OAuthConsent`.
  '/oauth/authorize': {
    out: 'oauth/authorize/index.html',
    title: 'Autorizzazione accesso — ETF Lens',
    description: 'Pagina di consenso per autorizzare un client esterno ad accedere ai dati del tuo portafoglio ETF Lens.',
    canonical: `${SITE}/oauth/authorize`,
    noindex: true,
  },
  // Servita da Vercel con status 404 per ogni path senza corrispondenza.
  '/404': {
    out: '404.html',
    title: 'Pagina non trovata — ETF Lens',
    description: 'La pagina richiesta non esiste o è stata spostata.',
    canonical: `${SITE}/404`,
    noindex: true,
  },
}

// Una rotta servita dalla SPA ma senza metadati qui riceverebbe il markup della
// home: meglio rompere il build che accorgersene dal comportamento in produzione.
const senzaMetadati = [...KNOWN_ROUTES, NOT_FOUND_ROUTE].filter((rotta) => !routes[rotta])
if (senzaMetadati.length > 0) {
  throw new Error(`prerender: rotte dichiarate in routes.js ma senza metadati: ${senzaMetadati.join(', ')}`)
}

/** Sostituisce l'unica occorrenza attesa; fallisce il build se il template cambia. */
function replaceOnce(html, pattern, replacement, label) {
  const found = html.match(new RegExp(pattern.source, pattern.flags + 'g'))
  if (found?.length !== 1) {
    throw new Error(`prerender: atteso 1 match per "${label}", trovati ${found?.length ?? 0}`)
  }
  return html.replace(pattern, () => replacement)
}

function applyMeta(html, meta, isHome) {
  const subs = [
    [/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`, 'title'],
    [/<meta name="description" content="[^"]*"/, `<meta name="description" content="${meta.description}"`, 'meta description'],
    [/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${meta.canonical}"`, 'canonical'],
    [/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${meta.canonical}"`, 'og:url'],
    [/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${meta.title}"`, 'og:title'],
    [/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${meta.description}"`, 'og:description'],
    [/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${meta.title}"`, 'twitter:title'],
    [/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${meta.description}"`, 'twitter:description'],
  ]
  for (const [pattern, replacement, label] of subs) {
    html = replaceOnce(html, pattern, replacement, label)
  }

  if (meta.noindex) {
    html = replaceOnce(
      html,
      /<link rel="canonical"/,
      '<meta name="robots" content="noindex, follow" />\n    <link rel="canonical"',
      'punto di inserimento meta robots'
    )
  }

  // Il FAQPage descrive solo la landing: lasciarlo altrove dichiarerebbe a Google
  // delle FAQ che quelle pagine non contengono.
  if (!isHome) {
    html = replaceOnce(
      html,
      /\s*<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "FAQPage"[\s\S]*?<\/script>/,
      '',
      'blocco JSON-LD FAQPage'
    )
  }
  return html
}

for (const [url, meta] of Object.entries(routes)) {
  const isHome = url === '/'
  const appHtml = render(url)
  let html = template.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
  html = applyMeta(html, meta, isHome)

  const outPath = path.join(root, 'dist', meta.out)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  await fs.writeFile(outPath, html)

  console.log(`Prerendered: ${url} → dist/${meta.out}${meta.noindex ? ' (noindex)' : ''}`)
}

console.log('Prerendering done.')
