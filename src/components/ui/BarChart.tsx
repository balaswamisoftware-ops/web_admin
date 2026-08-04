export interface BarDatum {
  label: string
  value: number
}

/**
 * A minimal, dependency-free vertical bar chart. Bars scale to the largest
 * value; each shows its value on top and its label beneath. Theme-aware.
 */
export function BarChart({
  data,
  height = 160,
}: {
  data: BarDatum[]
  height?: number
}) {
  const max = Math.max(1, ...data.map(d => d.value))

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-medium text-stone-400">{d.value}</span>
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 1)}%` }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[11px] text-stone-400">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
