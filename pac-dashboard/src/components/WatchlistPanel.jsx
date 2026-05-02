import { useState, useRef, Fragment } from 'react'
import { useWatchlist } from '../hooks/useWatchlist'
import { useLocale } from '../hooks/useLocale'

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/

const ERROR_KEYS = {
  isin_invalid: 'watchlist_error_isin_invalid',
  not_found:    'watchlist_error_not_found',
  duplicate:    'watchlist_error_duplicate',
  limit:        'watchlist_error_limit',
  db:           'watchlist_error_db',
}

export default function WatchlistPanel() {
  const { t } = useLocale()
  const { items, prezzi, loading, aggiungiETF, rimuoviETF, aggiornaPrezzi } = useWatchlist()

  const [isinInput, setIsinInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [formError, setFormError] = useState(null)
  const inputRef = useRef(null)

  async function handleAdd(e) {
    e.preventDefault()
    setFormError(null)
    setAdding(true)
    try {
      await aggiungiETF(isinInput)
      setIsinInput('')
      inputRef.current?.focus()
    } catch (err) {
      setFormError(t(ERROR_KEYS[err.message] ?? 'watchlist_error_db'))
    } finally {
      setAdding(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await aggiornaPrezzi(items)
    setRefreshing(false)
  }

  return (
    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t('watchlist_title')}
        </h2>
        {items.length > 0 && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title={t('watchlist_refresh')}
            aria-label={t('watchlist_refresh')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-50 transition-colors"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={isinInput}
          onChange={e => setIsinInput(e.target.value.toUpperCase())}
          placeholder={t('watchlist_add_placeholder')}
          maxLength={12}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={adding}
        />
        <div className="relative group">
          <button
            type="submit"
            disabled={adding || !ISIN_RE.test(isinInput)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
          >
            {adding ? '…' : t('watchlist_add_btn')}
          </button>
          {!ISIN_RE.test(isinInput) && isinInput.length > 0 && (
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-56">
              <div className="bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg">
                {t('watchlist_error_isin_invalid')}
                <div className="absolute top-full right-3 border-4 border-transparent border-t-slate-800 dark:border-t-slate-700" />
              </div>
            </div>
          )}
        </div>
      </form>

      {formError && (
        <p className="text-red-600 dark:text-red-400 text-sm mb-3">{formError}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">{t('watchlist_loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-400">{t('watchlist_empty')}</p>
      ) : (
        <>
          {/* Mobile layout (< sm): 2 righe per item, cestino con rowspan */}
          <table className="sm:hidden w-full text-sm">
            <tbody>
              {items.map(item => {
                const prezzo = prezzi[item.isin]
                const prezzoStr = prezzo != null
                  ? `€ ${prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : t('watchlist_price_na')
                return (
                  <Fragment key={item.id}>
                    <tr className="border-t border-gray-100 dark:border-gray-700">
                      <td className="pt-2 pr-3 font-mono">
                        <a
                          href={`https://www.extraetf.com/it/etf-profile/${item.isin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.isin}
                        </a>
                      </td>
                      <td className="pt-2 pr-2 text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                        {item.nome ?? '—'}
                      </td>
                      <td className="py-2 pl-2 text-right align-middle" rowSpan={2}>
                        <button
                          onClick={() => rimuoviETF(item.id)}
                          title={t('watchlist_remove')}
                          aria-label={t('watchlist_remove')}
                          className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    <tr>
                      <td className="pb-2 pr-3 tabular-nums font-medium text-gray-800 dark:text-gray-100">
                        {prezzoStr}
                      </td>
                      <td className="pb-2 pr-2 text-xs text-gray-400 dark:text-gray-500 truncate">
                        {item.emittente ?? '—'}
                      </td>
                    </tr>
                  </Fragment>
                )
              })}
            </tbody>
          </table>

          {/* Desktop layout (sm+): tabella originale */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 pr-3 font-medium">{t('watchlist_col_isin')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('watchlist_col_nome')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('watchlist_col_emittente')}</th>
                  <th className="pb-2 pr-3 font-medium text-right">{t('watchlist_col_prezzo')}</th>
                  <th className="pb-2 font-medium text-right">{t('watchlist_col_azioni')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const prezzo = prezzi[item.isin]
                  return (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <td className="py-2 pr-3 font-mono">
                        <a
                          href={`https://www.extraetf.com/it/etf-profile/${item.isin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {item.isin}
                        </a>
                      </td>
                      <td className="py-2 pr-3 text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                        {item.nome ?? '—'}
                      </td>
                      <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">
                        {item.emittente ?? '—'}
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-gray-800 dark:text-gray-100 tabular-nums">
                        {prezzo != null
                          ? `€ ${prezzo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : t('watchlist_price_na')}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => rimuoviETF(item.id)}
                          title={t('watchlist_remove')}
                          aria-label={t('watchlist_remove')}
                          className="text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
