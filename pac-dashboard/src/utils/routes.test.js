import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { KNOWN_ROUTES, NOT_FOUND_ROUTE, normalizePath, isKnownRoute } from './routes'

describe('normalizePath', () => {
  it('lascia invariata la root', () => {
    expect(normalizePath('/')).toBe('/')
  })

  it('rimuove il trailing slash', () => {
    expect(normalizePath('/privacy/')).toBe('/privacy')
    expect(normalizePath('/oauth/authorize/')).toBe('/oauth/authorize')
  })

  it('collassa i trailing slash multipli', () => {
    expect(normalizePath('/termini///')).toBe('/termini')
  })

  it('riporta alla root un path composto di soli slash', () => {
    expect(normalizePath('///')).toBe('/')
  })

  it('gestisce input vuoti o non stringa senza lanciare', () => {
    expect(normalizePath('')).toBe('/')
    expect(normalizePath(undefined)).toBe('/')
    expect(normalizePath(null)).toBe('/')
  })

  it('non tocca i path interni', () => {
    expect(normalizePath('/oauth/authorize')).toBe('/oauth/authorize')
  })
})

describe('isKnownRoute', () => {
  it('riconosce tutte le rotte dichiarate', () => {
    for (const rotta of KNOWN_ROUTES) {
      expect(isKnownRoute(rotta)).toBe(true)
    }
  })

  it('riconosce le rotte anche con trailing slash', () => {
    expect(isKnownRoute('/privacy/')).toBe(true)
  })

  it('rifiuta i path sconosciuti', () => {
    expect(isKnownRoute('/non-esiste')).toBe(false)
    expect(isKnownRoute('/dashboard')).toBe(false)
    expect(isKnownRoute('/privacy/extra')).toBe(false)
  })

  it('non considera nota la rotta 404', () => {
    expect(isKnownRoute(NOT_FOUND_ROUTE)).toBe(false)
  })
})

describe('allineamento con il prerender', () => {
  const prerender = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/prerender.mjs'),
    'utf-8'
  )

  // Il prerender genera l'HTML statico per rotta: se una rotta nota non ha
  // metadati lì, in produzione riceve il markup della home e l'idratazione salta.
  it('ogni rotta nota ha una voce in prerender.mjs', () => {
    for (const rotta of KNOWN_ROUTES) {
      expect(prerender, `rotta ${rotta} senza metadati nel prerender`).toContain(`'${rotta}': {`)
    }
  })

  it('la rotta 404 ha una voce in prerender.mjs', () => {
    expect(prerender).toContain(`'${NOT_FOUND_ROUTE}': {`)
  })

  it('le pagine non indicizzabili sono marcate noindex', () => {
    for (const rotta of ['/oauth/authorize', NOT_FOUND_ROUTE]) {
      const blocco = prerender.slice(prerender.indexOf(`'${rotta}': {`))
      const fineBlocco = blocco.indexOf('},')
      expect(blocco.slice(0, fineBlocco), `${rotta} dovrebbe essere noindex`).toContain('noindex: true')
    }
  })
})

describe('allineamento con vercel.json', () => {
  const vercelConfig = JSON.parse(
    readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), '../../vercel.json'),
      'utf-8'
    )
  )

  // Un rewrite catch-all rimanderebbe ogni URL inesistente su index.html con
  // HTTP 200, che è esattamente il soft 404 che la pagina 404 elimina.
  it('nessun rewrite cattura tutti i path', () => {
    const catchAll = vercelConfig.rewrites.filter((r) => r.destination === '/index.html')
    expect(catchAll).toEqual([])
  })

  it('il build command esegue la pipeline completa di prerendering', () => {
    expect(vercelConfig.buildCommand).toBe('npm run build')
  })
})
