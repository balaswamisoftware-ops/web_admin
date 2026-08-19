import { useId, useMemo, useState } from 'react'

export interface SeriesPoint {
  /** ISO date ("2026-08-19") or any label; used for the tooltip. */
  date: string
  value: number
}

interface LineChartProps {
  data: SeriesPoint[]
  height?: number
  /** Formats the value in the tooltip and the y-axis cap. */
  format?: (n: number) => string
  /** Tailwind text-color class the line/fill derive from. */
  className?: string
}

// Fixed viewBox; the SVG scales to its container so no resize observer is needed.
const W = 600
const H = 200
const PAD = { top: 12, right: 4, bottom: 18, left: 4 }

const shortDate = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/**
 * Dependency-free area/line chart for a daily series. Hovering snaps to the
 * nearest point and shows an inline readout — enough to answer "which day did
 * chanting spike?" without pulling in a charting library.
 */
export function LineChart({
  data,
  height = 180,
  format = n => n.toLocaleString('en-IN'),
  className = 'text-brand-500',
}: LineChartProps) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)

  const { points, max, path, area } = useMemo(() => {
    const values = data.map(d => d.value)
    const maxValue = Math.max(1, ...values)
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const step = data.length > 1 ? innerW / (data.length - 1) : 0

    const pts = data.map((d, i) => ({
      x: PAD.left + (data.length > 1 ? i * step : innerW / 2),
      y: PAD.top + innerH - (d.value / maxValue) * innerH,
      ...d,
    }))

    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ')
    const fill =
      pts.length > 0
        ? `${line} L${pts[pts.length - 1].x.toFixed(2)},${(H - PAD.bottom).toFixed(
            2,
          )} L${pts[0].x.toFixed(2)},${(H - PAD.bottom).toFixed(2)} Z`
        : ''

    return { points: pts, max: maxValue, path: line, area: fill }
  }, [data])

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-stone-400">No activity yet.</p>
    )
  }

  const active = hover != null ? points[hover] : null
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between text-xs">
        <span className="font-medium text-stone-500">
          {active ? shortDate(active.date) : `${data.length} days`}
        </span>
        <span className="font-semibold text-stone-800 dark:text-stone-100">
          {active ? format(active.value) : format(total)}
          <span className="ml-1 font-normal text-stone-400">
            {active ? '' : 'total'}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height }}
        className="w-full overflow-visible"
        role="img"
        aria-label={`Daily series, peak ${format(max)}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={e => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const ratio = (e.clientX - rect.left) / rect.width
          const idx = Math.round(ratio * (data.length - 1))
          setHover(Math.min(data.length - 1, Math.max(0, idx)))
        }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline */}
        <line
          x1={PAD.left}
          y1={H - PAD.bottom}
          x2={W - PAD.right}
          y2={H - PAD.bottom}
          stroke="currentColor"
          strokeOpacity="0.15"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {active && (
          <>
            <line
              x1={active.x}
              y1={PAD.top}
              x2={active.x}
              y2={H - PAD.bottom}
              stroke="currentColor"
              strokeOpacity="0.35"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="4"
              fill="currentColor"
              stroke="white"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] text-stone-400">
        <span>{shortDate(data[0].date)}</span>
        <span>{shortDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  )
}
