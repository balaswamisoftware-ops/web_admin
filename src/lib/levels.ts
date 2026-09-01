import type { ChantLevel } from '../types/mission'

/**
 * Mirrors the seed in `chant-levels.sql`. Used when the server predates the
 * feature, so the portal still renders a sensible ladder to edit.
 */
export const DEFAULT_LEVELS: ChantLevel[] = [
  { n: 1, name: 'Bhakta', from: 0, to: 100000 },
  { n: 2, name: 'Sadhaka', from: 100000, to: 300000 },
  { n: 3, name: 'Yogi', from: 300000, to: 500000 },
  { n: 4, name: 'Siddha', from: 500000, to: 900000 },
  { n: 5, name: 'Maha Siddha', from: 900000, to: 1100000 },
]

/** Coerce a stored `chant_levels` value into a usable ladder. */
export function parseLevels(raw: unknown): ChantLevel[] {
  if (!Array.isArray(raw)) return DEFAULT_LEVELS
  const cleaned = raw
    .map((item, i) => {
      if (!item || typeof item !== 'object') return null
      const l = item as Record<string, unknown>
      const from = Math.floor(Number(l.from))
      const to = Math.floor(Number(l.to))
      if (!Number.isFinite(from) || !Number.isFinite(to)) return null
      const name = typeof l.name === 'string' ? l.name.trim() : ''
      return { n: i + 1, name: name || `Level ${i + 1}`, from, to }
    })
    .filter((l): l is ChantLevel => l !== null)
    .sort((a, b) => a.from - b.from)
    .map((l, i) => ({ ...l, n: i + 1 }))
  return cleaned.length > 0 ? cleaned : DEFAULT_LEVELS
}

/** The hard ceiling — the end of the last level. */
export function ceilingOf(levels: ChantLevel[]): number {
  if (levels.length === 0) return 0
  return levels[levels.length - 1].to
}

/** The level a chant count sits in. Clamped, so it never returns undefined. */
export function levelFor(count: number, levels: ChantLevel[]): ChantLevel | null {
  if (levels.length === 0) return null
  for (const level of levels) {
    if (count < level.to) return level
  }
  return levels[levels.length - 1]
}

/**
 * The same rules `validate_chant_levels()` enforces in Postgres, so a bad ladder
 * is caught before the round trip. Returns a readable message, or null when the
 * ladder is fine.
 */
export function validateLevels(levels: ChantLevel[]): string | null {
  if (levels.length === 0) return 'Add at least one chant level.'
  let prevTo: number | null = null
  for (const level of levels) {
    const name = level.name.trim()
    if (!name) return `Level ${level.n} needs a name.`
    if (!Number.isFinite(level.from) || !Number.isFinite(level.to))
      return `Level "${name}" has a non-numeric range.`
    if (level.from < 0) return `Level "${name}" cannot start below 0.`
    if (level.to <= level.from)
      return `Level "${name}" must end above its start (${level.from} → ${level.to}).`
    if (prevTo === null) {
      if (level.from !== 0)
        return `The first level must start at 0 (it starts at ${level.from}).`
    } else if (level.from !== prevTo) {
      // A gap would leave a devotee level-less; an overlap would put them in two.
      return `Level "${name}" must start at ${prevTo} to follow the previous level.`
    }
    prevTo = level.to
  }
  return null
}
