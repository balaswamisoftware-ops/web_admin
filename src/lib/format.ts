/** "9876543210" -> "98765 43210". */
export function formatMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '')
  return digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : mobile
}

/**
 * Compact Indian-units formatting: 110000000 -> "11 Cr", 100000 -> "1 Lakh",
 * 2500 -> "2.5 K". Trailing zeros are trimmed. Smaller values fall back to a
 * grouped "en-IN" number.
 */
export function formatIndianCompact(n: number): string {
  const unit = (value: number, suffix: string) =>
    `${value.toFixed(2).replace(/\.?0+$/, '')} ${suffix}`
  const abs = Math.abs(n)
  if (abs >= 1e7) return unit(n / 1e7, 'Cr')
  if (abs >= 1e5) return unit(n / 1e5, 'Lakh')
  if (abs >= 1e3) return unit(n / 1e3, 'K')
  return n.toLocaleString('en-IN')
}

/** ISO string -> "2 Jun 2026". */
export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
