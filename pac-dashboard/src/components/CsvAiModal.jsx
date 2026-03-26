import { useEffect, useId, useRef, useState } from 'react'
import { useLocale } from '../hooks/useLocale'

const PROMPT_IT = `Sei un assistente esperto in dati finanziari. Ho un file CSV con i miei acquisti ETF e voglio importarli in ETF Lens.

Converti il CSV nel seguente formato JSON:

{
  "etf": [
    {
      "nome": "iShares Core MSCI World",
      "isin": "IE00B4L5Y983",
      "emittente": "BlackRock",
      "importoFisso": 100,
      "prezzoCorrente": 95.50,
      "archiviato": false,
      "acquisti": [
        {
          "data": "2024-01-15",
          "importoInvestito": 100.00,
          "prezzoUnitario": 95.50,
          "quoteFrazionate": 1.047,
          "fee": 1.50,
          "brokerNome": "Fineco"
        }
      ]
    }
  ],
  "broker": [
    {
      "nome": "Fineco",
      "colore": "#6366f1",
      "archiviato": false
    }
  ],
  "orizzonteAnni": 10
}

Regole:
- Ogni ETF distinto (per ISIN) è un elemento dell'array "etf"
- "importoFisso" è la rata mensile abituale in €; stima dal CSV se non disponibile
- "prezzoCorrente" è il prezzo attuale in € (usa l'ultimo prezzo del CSV)
- "quoteFrazionate" = importoInvestito / prezzoUnitario
- Le date devono essere in formato YYYY-MM-DD
- "brokerNome" deve corrispondere al nome nell'array "broker"
- "fee" è la commissione in €; usa 0 se non disponibile
- Rispondi SOLO con il JSON valido, senza testo aggiuntivo

Ecco il mio CSV:
[INCOLLA QUI IL TUO CSV]`

const PROMPT_EN = `You are an expert financial data assistant. I have a CSV file with my ETF purchases and I want to import them into ETF Lens.

Convert the CSV into the following JSON format:

{
  "etf": [
    {
      "nome": "iShares Core MSCI World",
      "isin": "IE00B4L5Y983",
      "emittente": "BlackRock",
      "importoFisso": 100,
      "prezzoCorrente": 95.50,
      "archiviato": false,
      "acquisti": [
        {
          "data": "2024-01-15",
          "importoInvestito": 100.00,
          "prezzoUnitario": 95.50,
          "quoteFrazionate": 1.047,
          "fee": 1.50,
          "brokerNome": "Fineco"
        }
      ]
    }
  ],
  "broker": [
    {
      "nome": "Fineco",
      "colore": "#6366f1",
      "archiviato": false
    }
  ],
  "orizzonteAnni": 10
}

Rules:
- Each distinct ETF (by ISIN) is one element of the "etf" array
- "importoFisso" is the usual monthly contribution in €; estimate from the CSV if not available
- "prezzoCorrente" is the current price in € (use the last price in the CSV)
- "quoteFrazionate" = importoInvestito / prezzoUnitario
- Dates must be in YYYY-MM-DD format
- "brokerNome" must match the name in the "broker" array
- "fee" is the commission in €; use 0 if not available
- Reply with ONLY valid JSON, no additional text

Here is my CSV:
[PASTE YOUR CSV HERE]`

export default function CsvAiModal({ isOpen, onClose, onImport }) {
  const { t, lingua } = useLocale()
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState('')
  const [successo, setSuccesso] = useState(false)
  const [copiato, setCopiato] = useState(false)
  const [loading, setLoading] = useState(false)
  const dialogRef = useRef(null)
  const titleId = useId()

  const prompt = lingua === 'it' ? PROMPT_IT : PROMPT_EN

  useEffect(() => {
    if (isOpen) {
      setTesto('')
      setErrore('')
      setSuccesso(false)
      setCopiato(false)
    }
  }, [isOpen])

  const getFocusable = () => [...(dialogRef.current?.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  async function handleCopiaPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiato(true)
      setTimeout(() => setCopiato(false), 2000)
    } catch {
      // fallback silenzioso
    }
  }

  async function handleImporta() {
    if (!testo.trim()) return
    setErrore('')
    setSuccesso(false)
    setLoading(true)
    try {
      const blob = new Blob([testo], { type: 'application/json' })
      const file = new File([blob], 'csv-ai-import.json', { type: 'application/json' })
      await onImport(file)
      setSuccesso(true)
      setTesto('')
    } catch (err) {
      setErrore(err?.message || t('import_errore'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">{t('csv_ai_title')}</h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xl">✕</button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400">{t('csv_ai_desc')}</p>

        {/* Prompt area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('csv_ai_prompt_label')}</span>
            <button
              type="button"
              onClick={handleCopiaPrompt}
              className="text-xs px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition-colors"
            >
              {copiato ? t('csv_ai_copiato') : t('csv_ai_copia')}
            </button>
          </div>
          <pre className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 rounded-xl p-3 overflow-auto max-h-36 whitespace-pre-wrap font-mono leading-relaxed">
            {prompt}
          </pre>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300">{t('csv_ai_incolla_label')}</label>
          <textarea
            value={testo}
            onChange={e => { setTesto(e.target.value); setErrore(''); setSuccesso(false) }}
            rows={6}
            placeholder='{ "etf": [...], "broker": [...], "orizzonteAnni": 10 }'
            className="w-full bg-slate-100 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 font-mono resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {errore && (
          <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{errore}</p>
        )}
        {successo && (
          <p className="text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{t('csv_ai_successo')}</p>
        )}

        <button
          type="button"
          disabled={!testo.trim() || loading}
          onClick={handleImporta}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
        >
          {t('csv_ai_importa')}
        </button>
      </div>
    </div>
  )
}
