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

/** ISO string -> "2 Jun 2026, 4:05 PM". */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** ISO string -> "3 days ago" / "in 2 months". Falls back to a date if far off. */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const seconds = Math.round((then - Date.now()) / 1000)
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const rtf = new Intl.RelativeTimeFormat('en-IN', { numeric: 'auto' })
  for (const [unit, secondsPerUnit] of units) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return rtf.format(Math.round(seconds / secondsPerUnit), unit)
    }
  }
  return 'just now'
}

/** 1234567 -> "12,34,567" (Indian digit grouping). */
export const formatNumber = (n: number) => n.toLocaleString('en-IN')

/** 216 -> "₹216". */
export const formatInr = (n: number) => `₹${n.toLocaleString('en-IN')}`
