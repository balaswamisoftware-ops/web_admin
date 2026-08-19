/**
 * Date-range helpers for the report / audit / payment filters.
 *
 * The UI works in `<input type="date">` strings ("2026-08-19") and the RPCs take
 * timestamps, so everything converts through here. `to` is always turned into
 * an EXCLUSIVE upper bound at the start of the next day — otherwise a range
 * ending "today" silently drops everything that happened today.
 */

export interface DateRange {
  /** Inclusive lower bound, "YYYY-MM-DD" or ''. */
  from: string
  /** Inclusive upper bound as the user reads it, "YYYY-MM-DD" or ''. */
  to: string
}

export const EMPTY_RANGE: DateRange = { from: '', to: '' }

/** "YYYY-MM-DD" in local time (what `<input type="date">` expects). */
export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Range start as an ISO instant, or null when unset. */
export function rangeStart(range: DateRange): string | null {
  if (!range.from) return null
  const d = new Date(`${range.from}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** Range end as an EXCLUSIVE ISO instant (start of the following day). */
export function rangeEnd(range: DateRange): string | null {
  if (!range.to) return null
  const d = new Date(`${range.to}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() + 1)
  return d.toISOString()
}

export const isRangeSet = (range: DateRange) => Boolean(range.from || range.to)

/** True when `from` is after `to` — the one combination worth warning about. */
export function isRangeInvalid(range: DateRange): boolean {
  return Boolean(range.from && range.to && range.from > range.to)
}

/** Named shortcuts offered next to the two date inputs. */
export const RANGE_PRESETS: { key: string; label: string; build: () => DateRange }[] = [
  {
    key: '7d',
    label: 'Last 7 days',
    build: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 6)
      return { from: toDateInput(from), to: toDateInput(to) }
    },
  },
  {
    key: '30d',
    label: 'Last 30 days',
    build: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 29)
      return { from: toDateInput(from), to: toDateInput(to) }
    },
  },
  {
    key: 'month',
    label: 'This month',
    build: () => {
      const now = new Date()
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: toDateInput(now),
      }
    },
  },
  {
    key: 'lastMonth',
    label: 'Last month',
    build: () => {
      const now = new Date()
      return {
        from: toDateInput(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        to: toDateInput(new Date(now.getFullYear(), now.getMonth(), 0)),
      }
    },
  },
  {
    key: 'year',
    label: 'This year',
    build: () => {
      const now = new Date()
      return {
        from: toDateInput(new Date(now.getFullYear(), 0, 1)),
        to: toDateInput(now),
      }
    },
  },
]

/** Human label for the current range, e.g. "1 Aug 2026 – 19 Aug 2026". */
export function describeRange(range: DateRange): string {
  const fmt = (s: string) =>
    new Date(`${s}T00:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  if (range.from && range.to) return `${fmt(range.from)} – ${fmt(range.to)}`
  if (range.from) return `from ${fmt(range.from)}`
  if (range.to) return `up to ${fmt(range.to)}`
  return 'all time'
}
