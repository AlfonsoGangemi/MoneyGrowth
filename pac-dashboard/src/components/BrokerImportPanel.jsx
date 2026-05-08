import { useRef, useState } from 'react'
import { useBrokerImport } from '../hooks/useBrokerImport'
import { useLocale } from '../hooks/useLocale'

export default function BrokerImportPanel({ broker, inModal = false, initialBrokerId = null }) {
  const { t } = useLocale()
  const { isPro, syncLog, loading, importCsv } = useBrokerImport()

  const [selectedBrokerId, setSelectedBrokerId] = useState(initialBrokerId ?? '')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)

  const inputRef = useRef(null)

  const brokerAttivi = broker.filter(b => !b.archiviato)

  if (loading) return null

  if (!isPro) {
    if (inModal) {
      return (
        <p className="text-sm text-blue-600 dark:text-blue-400">
          {t('broker_import_pro_gate')}
        </p>
      )
    }
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          {t('broker_import_title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('broker_import_pro_gate')}
        </p>
      </section>
    )
  }

  function handleFile(f) {
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  async function handleImport() {
    if (!file || !selectedBrokerId || uploading) return
    setUploading(true)
    setResult(null)
    setError(null)
    try {
      const text = await file.text()
      const res = await importCsv(selectedBrokerId, text)
      setResult(res)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) {
      if (err.code === 'csv_non_riconosciuto') {
        setError(t('broker_import_errore_csv'))
      } else {
        setError(`${t('broker_import_errore_server')}: ${err.message}`)
      }
    } finally {
      setUploading(false)
    }
  }

  const Wrapper = inModal ? 'div' : 'section'

  return (
    <Wrapper className={inModal ? 'space-y-4' : 'bg-white dark:bg-gray-800 rounded-2xl shadow p-6 space-y-4'}>
      {!inModal && (
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {t('broker_import_title')}
        </h2>
      )}

      {/* Selezione broker (nascosta quando pre-selezionata) */}
      {!initialBrokerId && (
        <select
          value={selectedBrokerId}
          onChange={e => setSelectedBrokerId(e.target.value)}
          disabled={uploading || brokerAttivi.length === 0}
          className="w-full sm:w-64 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">
            {brokerAttivi.length === 0
              ? t('broker_import_nessun_broker')
              : t('broker_import_seleziona_broker')}
          </option>
          {brokerAttivi.map(b => (
            <option key={b.id} value={b.id}>{b.nome}</option>
          ))}
        </select>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors select-none ${
          dragging
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        {file
          ? <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
          : <p className="text-sm text-gray-500 dark:text-gray-400">{t('broker_import_drop_hint')}</p>
        }
      </div>

      {/* Pulsante import */}
      <button
        onClick={handleImport}
        disabled={!file || !selectedBrokerId || uploading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
      >
        {uploading ? t('broker_import_uploading') : t('broker_import_btn')}
      </button>

      {/* Risultato */}
      {result && (
        <div className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-3">
          {t('broker_import_successo')
            .replace('{total}', result.total)
            .replace('{inserted}', result.inserted)
            .replace('{skipped}', result.skipped)}
        </div>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Storico import */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('broker_import_log_titolo')}
        </h3>

        {syncLog.length === 0 ? (
          <p className="text-sm text-gray-400">{t('broker_import_log_vuoto')}</p>
        ) : (
          <>
            {/* Mobile */}
            <div className="sm:hidden space-y-2">
              {syncLog.map(row => {
                const brokerNome = broker.find(b => b.id === row.broker_id)?.nome ?? '—'
                return (
                  <div key={row.id} className="border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 text-sm">
                    <div className="flex justify-between text-gray-500 dark:text-gray-400 text-xs mb-1">
                      <span>{new Date(row.synced_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>{brokerNome}</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-green-600 dark:text-green-400">+{row.rows_inserted ?? 0}</span>
                      <span className="text-gray-400">/{row.rows_skipped ?? 0}</span>
                      {row.error_message && (
                        <span className="text-red-500 text-xs truncate">{row.error_message}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pr-4 font-medium">{t('broker_import_log_data')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('broker_import_log_broker')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('broker_import_log_canale')}</th>
                    <th className="pb-2 pr-4 font-medium text-right">{t('broker_import_log_inserite')}</th>
                    <th className="pb-2 pr-4 font-medium text-right">{t('broker_import_log_saltate')}</th>
                    <th className="pb-2 font-medium">{t('broker_import_log_errore')}</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLog.map(row => {
                    const brokerNome = broker.find(b => b.id === row.broker_id)?.nome ?? '—'
                    const canale = row.source === 'ui_upload'
                      ? t('broker_import_canale_ui')
                      : t('broker_import_canale_bot')
                    return (
                      <tr key={row.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 tabular-nums whitespace-nowrap">
                          {new Date(row.synced_at).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{brokerNome}</td>
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{canale}</td>
                        <td className="py-2 pr-4 text-right text-green-600 dark:text-green-400 tabular-nums">
                          {row.rows_inserted ?? 0}
                        </td>
                        <td className="py-2 pr-4 text-right text-gray-500 dark:text-gray-400 tabular-nums">
                          {row.rows_skipped ?? 0}
                        </td>
                        <td className="py-2 text-red-500 text-xs truncate max-w-[180px]">
                          {row.error_message ?? ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Wrapper>
  )
}
