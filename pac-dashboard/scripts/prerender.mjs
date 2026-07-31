import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const template = await fs.readFile(path.join(root, 'dist/index.html'), 'utf-8')
const { render } = await import(pathToFileURL(path.join(root, 'dist-server/entry-server.js')).href)

const SITE = 'https://etflens.app'

// Metadati per rotta: senza questi ogni pagina eredita il canonical della home
// e Google la scarta come duplicato invece di indicizzarla.
const routes = {
  '/': {
    title: 'ETF Lens — Tracker gratuito per portafoglio ETF e PAC',
    description: 'ETF Lens: traccia il tuo portafoglio ETF e piano di accumulo (PAC), calcola rendimento reale, CAGR e proietta la crescita futura. Gratis, sicuro, senza pubblicità.',
    canonical: SITE,
  },
  '/privacy': {
    title: 'Privacy Policy — ETF Lens',
    description: 'Informativa privacy di ETF Lens: dati raccolti, finalità del trattamento, conservazione, condivisione con terze parti e i tuoi diritti ai sensi del GDPR.',
    canonical: `${SITE}/privacy`,
  },
  '/termini': {
    title: 'Termini di Servizio — ETF Lens',
    description: "Termini di servizio di ETF Lens: condizioni d'uso, account, limitazioni di responsabilità e disclaimer sugli strumenti di analisi del portafoglio ETF.",
    canonical: `${SITE}/termini`,
  },
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

  // Il FAQPage descrive solo la landing: lasciarlo su privacy/termini dichiarerebbe
  // a Google delle FAQ che quelle pagine non contengono.
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

  if (isHome) {
    await fs.writeFile(path.join(root, 'dist/index.html'), html)
  } else {
    const dir = path.join(root, 'dist', url)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'index.html'), html)
  }

  console.log(`Prerendered: ${url} → ${meta.canonical}`)
}

console.log('Prerendering done.')
