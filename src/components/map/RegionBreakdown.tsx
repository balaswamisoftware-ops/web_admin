import { useMemo, useState } from 'react'
import { ChevronRight, MapPin } from 'lucide-react'
import type { UserLocation } from '../../services/locationsService'

/**
 * Country → State → District tree with a devotee count at every level.
 *
 * Derived from the same points the globe renders rather than a second query,
 * so the totals here can never disagree with the map. Grouping client-side also
 * yields each region's centroid for free, which is what "fly to" needs.
 */

export interface Region {
  name: string
  count: number
  lat: number
  lng: number
  children: Region[]
}

const UNKNOWN = 'Unknown'
const label = (v: string | null) => (v && v.trim().length > 0 ? v.trim() : UNKNOWN)

/** Group points into a country → state → district tree, deepest level first. */
export function buildRegions(points: UserLocation[]): Region[] {
  type Node = { sumLat: number; sumLng: number; count: number; kids: Map<string, Node> }
  const root: Map<string, Node> = new Map()

  const touch = (map: Map<string, Node>, key: string, p: UserLocation): Node => {
    let n = map.get(key)
    if (!n) {
      n = { sumLat: 0, sumLng: 0, count: 0, kids: new Map() }
      map.set(key, n)
    }
    n.sumLat += p.lat
    n.sumLng += p.lng
    n.count += 1
    return n
  }

  for (const p of points) {
    const c = touch(root, label(p.country), p)
    const s = touch(c.kids, label(p.state), p)
    touch(s.kids, label(p.district), p)
  }

  // Centroid is the mean of the member points — good enough to aim a camera.
  const toRegions = (map: Map<string, Node>): Region[] =>
    [...map.entries()]
      .map(([name, n]) => ({
        name,
        count: n.count,
        lat: n.sumLat / n.count,
        lng: n.sumLng / n.count,
        children: toRegions(n.kids),
      }))
      // Busiest first, then alphabetical — and always sink "Unknown".
      .sort(
        (a, b) =>
          Number(a.name === UNKNOWN) - Number(b.name === UNKNOWN) ||
          b.count - a.count ||
          a.name.localeCompare(b.name),
      )

  return toRegions(root)
}

function Row({
  region,
  depth,
  onPick,
}: {
  region: Region
  depth: number
  onPick: (r: Region) => void
}) {
  // Countries open by default so the admin sees states without a click.
  const [open, setOpen] = useState(depth === 0)
  const hasKids = region.children.length > 0

  return (
    <li>
      <div
        className="flex items-center gap-1 rounded-lg px-1 py-1 hover:bg-stone-100 dark:hover:bg-white/5"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
            aria-expanded={open}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            <ChevronRight
              size={14}
              className={`transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onPick(region)}
          title="Show on the globe"
          className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
        >
          <span
            className={`truncate text-sm ${
              depth === 0
                ? 'font-semibold text-stone-900 dark:text-white'
                : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            {region.name}
          </span>
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium tabular-nums text-stone-600 dark:bg-white/10 dark:text-stone-300">
            {region.count.toLocaleString('en-IN')}
          </span>
        </button>
      </div>

      {hasKids && open ? (
        <ul>
          {region.children.map(child => (
            <Row key={child.name} region={child} depth={depth + 1} onPick={onPick} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function RegionBreakdown({
  points,
  onPick,
}: {
  points: UserLocation[]
  onPick: (r: Region) => void
}) {
  const regions = useMemo(() => buildRegions(points), [points])

  return (
    <div className="flex h-full flex-col rounded-3xl border border-stone-200/70 bg-white p-4 dark:border-white/10 dark:bg-stone-900">
      <div className="mb-2 flex items-center gap-2">
        <MapPin size={16} className="text-stone-400" />
        <h2 className="text-sm font-semibold text-stone-900 dark:text-white">
          By region
        </h2>
      </div>

      {regions.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-400">Nothing to show yet.</p>
      ) : (
        <ul className="-mx-1 flex-1 overflow-y-auto">
          {regions.map(r => (
            <Row key={r.name} region={r} depth={0} onPick={onPick} />
          ))}
        </ul>
      )}

      <p className="mt-2 border-t border-stone-200/70 pt-2 text-xs text-stone-400 dark:border-white/10">
        Click a region to centre the globe on it.
      </p>
    </div>
  )
}
