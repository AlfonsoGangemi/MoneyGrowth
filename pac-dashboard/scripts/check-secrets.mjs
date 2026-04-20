#!/usr/bin/env node
/**
 * Modalità:
 *   --bundle  scansiona dist/ per variabili segrete iniettate da Vite (default)
 *   --staged  scansiona i file in staging git per pattern di segreti
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { join, resolve } from 'path'

const mode = process.argv[2] ?? '--bundle'
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

// File che non devono mai essere committati
const FORBIDDEN_FILES = new Set(['.env', '.env.local', '.env.production', '.env.development'])

// Pattern che non devono mai comparire nel contenuto (staged o bundle)
const FORBIDDEN_PATTERNS = [
  { re: /VITE_SUPABASE_SERVICE_KEY/, label: 'service key con prefisso VITE_ (verrebbe iniettata nel bundle)' },
  { re: /pac_[0-9a-f]{64}/,          label: 'API key MCP hardcoded (pac_...)' },
  { re: /SUPABASE_SERVICE_KEY\s*=\s*ey[A-Za-z0-9_-]{20,}/, label: 'service key Supabase con valore JWT' },
]

function check(filename, content) {
  const hits = []
  for (const { re, label } of FORBIDDEN_PATTERNS) {
    if (re.test(content)) hits.push(`  ✗ ${label}`)
  }
  if (hits.length) {
    console.error(`SECURITY: segreto trovato in ${filename}:`)
    hits.forEach(h => console.error(h))
  }
  return hits.length
}

// ── BUNDLE MODE ──────────────────────────────────────────────────────────────
function checkBundle() {
  const dist = resolve(ROOT, 'dist')
  let found = 0

  function walk(dir) {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f)
      if (statSync(full).isDirectory()) { walk(full); continue }
      if (!/\.(js|map|html)$/.test(full)) continue
      found += check(full.replace(ROOT, ''), readFileSync(full, 'utf8'))
    }
  }

  walk(dist)
  if (found) process.exit(1)
  console.log('check-secrets --bundle: OK')
}

// ── STAGED MODE ──────────────────────────────────────────────────────────────
function checkStaged() {
  const stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf8' })
    .split('\n').map(f => f.trim()).filter(Boolean)

  let found = 0

  for (const file of stagedFiles) {
    // File di env che non devono mai essere committati
    const basename = file.split('/').pop()
    if (FORBIDDEN_FILES.has(basename)) {
      console.error(`SECURITY: file di ambiente committato: ${file}`)
      found++
      continue
    }

    // Controlla il contenuto staged del file (escludi gli script di check stessi)
    if (file.includes('check-secrets') || file.includes('check-bundle-secrets')) continue
    try {
      const content = execSync(`git show :${file}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
      found += check(file, content)
    } catch {
      // file binario o rimosso — skip
    }
  }

  if (found) process.exit(1)
  console.log('check-secrets --staged: OK')
}

if (mode === '--bundle') checkBundle()
else if (mode === '--staged') checkStaged()
else { console.error(`Modalità sconosciuta: ${mode}`); process.exit(1) }
