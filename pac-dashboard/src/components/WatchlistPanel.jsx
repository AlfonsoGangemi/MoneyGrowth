import { useState, useRef } from 'react'
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
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {refreshing ? '…' : t('watchlist_refresh')}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="pb-2 pr-3 font-medium">{t('watchlist_col_isin')}</th>
                <th className="pb-2 pr-3 font-medium">{t('watchlist_col_nome')}</th>
                <th className="pb-2 pr-3 font-medium hidden sm:table-cell">{t('watchlist_col_emittente')}</th>
                <th className="pb-2 pr-3 font-medium text-right">{t('watchlist_col_prezzo')}</th>
                <th className="pb-2 font-medium text-right">{t('watchlist_col_azioni')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const prezzo = prezzi[item.isin]
                return (
                  <tr
                    key={item.id}
                    className="border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
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
                    <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
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
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs"
                        aria-label={t('watchlist_remove')}
                      >
                        {t('watchlist_remove')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
