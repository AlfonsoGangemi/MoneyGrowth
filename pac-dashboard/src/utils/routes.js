/**
 * Rotte pubbliche servite dalla SPA.
 *
 * Unica fonte di verità condivisa tra `App.jsx` (routing client) e
 * `scripts/prerender.mjs` (generazione HTML statico): se una rotta è qui ma non
 * ha metadati nel prerender, il build fallisce invece di servirle il markup
 * della home e rompere l'idratazione.
 *
 * Ogni path non elencato riceve la pagina 404.
 */
export const KNOWN_ROUTES = ['/', '/privacy', '/termini', '/oauth/authorize']

/** Path della pagina servita da Vercel come `404.html`. */
export const NOT_FOUND_ROUTE = '/404'

/** Normalizza il path ignorando i trailing slash: `/privacy/` e `/privacy` sono la stessa rotta. */
export function normalizePath(rawPath) {
  if (typeof rawPath !== 'string' || rawPath === '') return '/'
  return rawPath.replace(/\/+$/, '') || '/'
}

/** True se il path corrisponde a una rotta servita dalla SPA. */
export function isKnownRoute(rawPath) {
  return KNOWN_ROUTES.includes(normalizePath(rawPath))
}
