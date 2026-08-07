import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist e dist-server sono output di build (Vite client e SSR): analizzarli
  // produce solo rumore su codice generato.
  globalIgnores(['dist', 'dist-server']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Il prefisso _ marca ciò che è volutamente inutilizzato: vale per variabili,
      // parametri di funzione (es. handler Express-like) e binding di catch.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // I catch vuoti qui sono soppressioni deliberate di errori di rete non critici
      // (quotazioni live, prezzi watchlist): il fallback è non aggiornare il dato.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Declassata a warning: segnala il pattern `useEffect(() => { fetchData() }, [])`
      // usato per il caricamento dati al mount in più hook. Correggerlo richiede di
      // ristrutturare il data fetching di watchlist, API key, import broker e grafici,
      // che oggi non hanno copertura di test → vedi task PAC-164.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // File eseguiti da Node: serverless functions, script di build e config Vite.
    files: ['api/**/*.js', 'scripts/**/*.mjs', 'vite.config.js', '*.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
])
