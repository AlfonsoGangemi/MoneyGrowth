import { createClient } from '@supabase/supabase-js'

const adminClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')

  const result = {}

  await Promise.allSettled([
    adminClient
      .from('acquisti')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (!error && count !== null) result.acquisti = count
      }),

    adminClient.auth.admin.listUsers({ perPage: 1 })
      .then(({ data, error }) => {
        if (!error && data?.total != null) result.utenti = data.total
      }),

    adminClient
      .from('etf')
      .select('*', { count: 'exact', head: true })
      .eq('archiviato', false)
      .then(({ count, error }) => {
        if (!error && count !== null) result.portafogli = count
      }),

    adminClient
      .from('acquisti')
      .select('importoInvestito')
      .then(({ data, error }) => {
        if (!error && data) {
          const sum = data.reduce((acc, r) => acc + (r.importoInvestito ?? 0), 0)
          result.capitale_gestito = Math.round(sum)
        }
      }),

    (async () => {
      const headers = { 'User-Agent': 'etflens-stats/1.0' }
      if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
      const ghRes = await fetch('https://api.github.com/repos/alfonsogangemi/moneygrowth', { headers })
      if (ghRes.ok) {
        const json = await ghRes.json()
        if (typeof json.stargazers_count === 'number') result.stelle_github = json.stargazers_count
      }
    })(),
  ])

  res.json(result)
}
