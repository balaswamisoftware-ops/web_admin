import { CalendarRange, X } from 'lucide-react'
import {
  EMPTY_RANGE,
  RANGE_PRESETS,
  isRangeInvalid,
  isRangeSet,
  type DateRange,
} from '../../lib/dateRange'

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
  /** Noun used in the helper line, e.g. "registrations". */
  label?: string
  className?: string
}

const inputCls =
  'h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

/**
 * From/to date filter with named shortcuts. Emits `DateRange` (plain
 * "YYYY-MM-DD" strings); callers convert with `rangeStart`/`rangeEnd` before
 * calling an RPC.
 */
export function DateRangePicker({
  value,
  onChange,
  label = 'records',
  className = '',
}: DateRangePickerProps) {
  const invalid = isRangeInvalid(value)

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
        From
        <input
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={e => onChange({ ...value, from: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
        To
        <input
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={e => onChange({ ...value, to: e.target.value })}
          className={inputCls}
        />
      </label>

      <div className="flex flex-wrap items-center gap-1 pb-0.5">
        {RANGE_PRESETS.map(preset => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onChange(preset.build())}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {preset.label}
          </button>
        ))}
        {isRangeSet(value) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_RANGE)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-400 transition-colors hover:bg-stone-100 hover:text-red-600 dark:hover:bg-white/10"
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {invalid ? (
        <p className="w-full text-xs font-medium text-red-600">
          The start date is after the end date — no {label} can match.
        </p>
      ) : (
        !isRangeSet(value) && (
          <p className="flex items-center gap-1.5 pb-2.5 text-xs text-stone-400">
            <CalendarRange size={13} /> All {label}
          </p>
        )
      )}
    </div>
  )
}
