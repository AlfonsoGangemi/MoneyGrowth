import { useEffect, useId, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useApiKeys } from '../hooks/useApiKeys'
import { useLocale } from '../hooks/useLocale'

const MCP_URL = 'https://etflens.app/api/mcp'

const ASSISTANTS = [
  { id: 'claude-code', label: 'Claude Code' },
  { id: 'cursor',      label: 'Cursor' },
  { id: 'codex',       label: 'Codex CLI' },
  { id: 'gemini',      label: 'Gemini CLI' },
  { id: 'kiro',        label: 'Kiro' },
  { id: 'other',       label: 'Other' },
]

function tomlBlock(obj) {
  const lines = []
  function write(node, path) {
    const entries = Object.entries(node).filter(([, v]) => v !== undefined)
    const scalars = entries.filter(([, v]) => typeof v !== 'object' || v === null)
    const objects = entries.filter(([, v]) => typeof v === 'object' && v !== null)
    if (path && scalars.length > 0) lines.push(`[${path}]`)
    scalars.forEach(([k, v]) => lines.push(`${k} = ${JSON.stringify(v)}`))
    objects.forEach(([k, v]) => { if (lines.length > 0) lines.push(''); write(v, path ? `${path}.${k}` : k) })
  }
  write(obj, '')
  return lines.join('\n').trimStart()
}

function getSnippet(id, t, key = null) {
  const auth = key ? `Bearer ${key}` : undefined
  const headers = auth ? { Authorization: auth } : undefined
  const mcpJson = (cfg) => JSON.stringify({ mcpServers: { etflens: cfg } }, null, 2)
  switch (id) {
    case 'claude-code':
      return {
        note: auth ? t('mcp_note_bearer_claude_code') : t('mcp_note_oauth_claude_code'),
        text: auth
          ? `claude mcp add --transport http etflens ${MCP_URL} --header "Authorization: ${auth}"`
          : `claude mcp add --transport http etflens ${MCP_URL}`,
      }
    case 'cursor':
      return { note: t('mcp_note_cursor'), text: mcpJson({ url: MCP_URL, ...(headers && { headers }) }) }
    case 'codex':
      return {
        note: t('mcp_note_codex'),
        text: tomlBlock({ mcp_servers: { etflens: { url: MCP_URL, ...(headers && { http_headers: headers }) } } }),
      }
    case 'gemini':
      return { note: t('mcp_note_gemini'), text: mcpJson({ url: MCP_URL, ...(headers && { headers }) }) }
    case 'kiro':
      return { note: t('mcp_note_kiro'), text: mcpJson({ type: 'http', url: MCP_URL, ...(headers && { headers }) }) }
    default:
      return {
        note: auth ? t('mcp_note_other_bearer') : t('mcp_note_other_oauth'),
        text: mcpJson({ type: 'http', url: MCP_URL, ...(headers && { headers }) }),
      }
  }
}

function fmt(iso) {
  if (!iso) return '—'
  try { return format(parseISO(iso), 'dd/MM/yyyy') } catch { return '—' }
}

function CopyButton({ text, t }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="text-xs px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-white transition-colors flex-shrink-0"
    >
      {copied ? t('mcp_copied') : t('mcp_copy')}
    </button>
  )
}

function SnippetBlock({ note, text, t }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-slate-500 dark:text-slate-400">{note}</p>
      <div className="relative">
        <pre className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-16 overflow-x-auto text-slate-800 dark:text-slate-200 font-mono leading-relaxed whitespace-pre-wrap break-all">
          {text}
        </pre>
        <div className="absolute top-2 right-2">
          <CopyButton text={text} t={t} />
        </div>
      </div>
    </div>
  )
}

export default function ApiKeyPanel({ onChiudi }) {
  const { keys, loading, newKey, error, generate, revoke, clearNewKey } = useApiKeys()
  const { t } = useLocale()
  const dialogRef = useRef(null)
  const titleId = useId()
  const [generating, setGenerating] = useState(false)
  const [assistant, setAssistant] = useState('claude-code')
  const [showManual, setShowManual] = useState(false)

  const getFocusable = () => [...(dialogRef.current?.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) ?? [])]

  useEffect(() => {
    const focusable = getFocusable()
    if (focusable.length) focusable[0].focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { onChiudi(); return }
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
  }, [onChiudi])

  async function handleGenerate() {
    setGenerating(true)
    await generate()
    setGenerating(false)
  }

  function handleRevoke(keyId) {
    if (!window.confirm(t('mcp_revoke_confirm'))) return
    revoke(keyId)
  }

  const oauthSnippet = getSnippet(assistant, t)
  const bearerSnippet = newKey ? getSnippet(assistant, t, newKey) : null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">{t('mcp_panel_title')}</h2>
          <button onClick={onChiudi} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xl">✕</button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">{t('mcp_panel_subtitle')}</p>

        {/* Selettore assistente */}
        <div className="flex flex-wrap gap-1 mb-4">
          {ASSISTANTS.map(a => (
            <button
              key={a.id}
              onClick={() => setAssistant(a.id)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                assistant === a.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Sezione primaria: OAuth */}
        <div className="mb-5 rounded-xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{t('mcp_oauth_label')}</span>
            <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">{t('mcp_oauth_recommended')}</span>
          </div>
          <SnippetBlock note={oauthSnippet.note} text={oauthSnippet.text} t={t} />
          <p className="text-xs text-slate-400 dark:text-slate-500">{t('mcp_oauth_footer')}</p>
        </div>

        {/* Sezione secondaria: chiave API manuale */}
        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <button
            onClick={() => setShowManual(v => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors w-full text-left"
          >
            <span className="text-[10px]">{showManual ? '▲' : '▼'}</span>
            <span>
              {t('mcp_manual_toggle')}
              {!showManual && <span className="ml-1 text-slate-300 dark:text-slate-600">{t('mcp_manual_toggle_hint')}</span>}
            </span>
          </button>

          {showManual && (
            <div className="mt-4 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('mcp_manual_desc')}</p>

              {/* Banner chiave appena generata */}
              {newKey && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t('mcp_new_key_warning')}</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 break-all text-slate-800 dark:text-slate-200 font-mono">
                      {newKey}
                    </code>
                    <CopyButton text={newKey} t={t} />
                  </div>
                  {bearerSnippet && <SnippetBlock note={bearerSnippet.note} text={bearerSnippet.text} t={t} />}
                  <button
                    onClick={clearNewKey}
                    className="w-full text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-xl py-2 transition-colors font-medium"
                  >
                    {t('mcp_key_saved')}
                  </button>
                </div>
              )}

              {/* Lista chiavi attive */}
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : keys.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">{t('mcp_no_keys')}</p>
              ) : (
                <div className="space-y-2">
                  {keys.map(k => (
                    <div
                      key={k.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/40 px-4 py-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                          {k.id.slice(0, 8)}…
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {t('mcp_key_created')} {fmt(k.created_at)} · {t('mcp_key_used')} {k.last_used_at ? fmt(k.last_used_at) : t('mcp_key_never')} · {t('mcp_key_expires')} {fmt(k.expires_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="flex-shrink-0 text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                      >
                        {t('mcp_revoke')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating || keys.length >= 2}
                className="w-full bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                {generating ? '…' : keys.length >= 2 ? t('mcp_generate_limit') : t('mcp_generate_btn')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
