import { useEffect, useId, useRef, useState } from 'react'
import { useLocale } from '../hooks/useLocale'
import CsvAiModal from './CsvAiModal'

export default function ImportExportModal({ isOpen, defaultTab = 'export', onClose, onExport, onImport, hasData }) {
  const { t } = useLocale()
  const [tab, setTab] = useState(defaultTab)
  const [csvAiOpen, setCsvAiOpen] = useState(false)
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)
  const dialogRef = useRef(null)
  const titleId = useId()

  // Sincronizza tab ogni volta che la modale si apre
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab)
      setErrore('')
      setSuccesso(false)
    }
  }, [isOpen, defaultTab])

  const getFocusable = () => [...(dialogRef.current?.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) ?? [])]

  useEffect(() => {
    if (!isOpen) return
    const focusable = getFocusable()
    if (focusable.length) focusable[0].focus()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const list = getFocusable()
      if (!list.length) return
      const first = list[0], last = list[list.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrore('')
    setSuccesso(false)
    if (!window.confirm(t('import_export_conferma'))) {
      e.target.value = ''
      return
    }
    try {
      await onImport(file)
      setSuccesso(true)
    } catch (err) {
      setErrore(err?.message || t('import_errore'))
    }
    e.target.value = ''
  }

  return (
    <>
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">{t('import_export_title')}</h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Tab */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => { setTab('export'); setErrore(''); setSuccesso(false) }}
            className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${tab === 'export' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            {t('import_export_tab_export')}
          </button>
          <button
            type="button"
            onClick={() => { setTab('import'); setErrore(''); setSuccesso(false) }}
            className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${tab === 'import' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
          >
            {t('import_export_tab_import')}
          </button>
        </div>

        {tab === 'export' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {hasData
                ? 'Scarica una copia JSON di tutti i tuoi ETF e acquisti.'
                : t('import_export_nessun_dato')}
            </p>
            <button
              type="button"
              disabled={!hasData}
              onClick={() => { onExport(); onClose() }}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {t('import_export_scarica')}
            </button>
          </div>
        )}

        {tab === 'import' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Seleziona un file JSON precedentemente esportato da ETF Lens.
            </p>
            {errore && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{errore}</p>
            )}
            {successo && (
              <p className="text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2">Importazione completata.</p>
            )}
            <label className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors cursor-pointer">
              {t('import_export_seleziona')}
              <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
            <button
              type="button"
              onClick={() => setCsvAiOpen(true)}
              className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {t('csv_ai_btn')}
            </button>
          </div>
        )}
      </div>
    </div>
    <CsvAiModal isOpen={csvAiOpen} onClose={() => setCsvAiOpen(false)} onImport={onImport} />
    </>
  )
}
