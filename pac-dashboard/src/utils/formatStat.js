export function formatStatValue(n) {
  if (n >= 1_000_000) return `${Math.floor(n / 1_000_000)}M+`
  if (n >= 10_000)    return `${Math.floor(n / 10_000) * 10}K+`
  if (n >= 1_000)     return `${Math.floor(n / 1_000)}K+`
  const mag = Math.pow(10, Math.floor(Math.log10(n)))
  return `${Math.floor(n / mag) * mag}+`
}
