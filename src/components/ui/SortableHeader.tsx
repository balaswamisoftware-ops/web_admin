import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { SortDir } from '../../hooks/useServerTable'

export interface Column {
  key: string
  label: string
  /** Right-align the cell (numbers). */
  numeric?: boolean
}

interface SortableHeaderProps {
  columns: Column[]
  sortKey: string
  sortDir: SortDir
  onSort: (key: string) => void
  /** Extra `<th>`s appended after the sortable ones. */
  children?: React.ReactNode
  /** A leading `<th>` (row number, checkbox, …). */
  leading?: React.ReactNode
}

/**
 * The sticky `<thead>` shared by every admin table: sortable buttons with an
 * explicit direction arrow, and an "unsorted" affordance so it's obvious the
 * column can be clicked.
 */
export function SortableHeader({
  columns,
  sortKey,
  sortDir,
  onSort,
  children,
  leading,
}: SortableHeaderProps) {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 shadow-[0_1px_0_theme(colors.stone.200)] dark:bg-neutral-900 dark:shadow-[0_1px_0_theme(colors.neutral.800)]">
        {leading}
        {columns.map(col => {
          const active = sortKey === col.key
          return (
            <th
              key={col.key}
              className={`px-4 py-3 font-semibold ${col.numeric ? 'text-right' : ''}`}
              aria-sort={
                active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
              }
            >
              <button
                type="button"
                onClick={() => onSort(col.key)}
                className={`group inline-flex items-center gap-1 transition-colors hover:text-stone-800 dark:hover:text-stone-200 ${
                  active ? 'text-stone-800 dark:text-stone-100' : ''
                }`}
              >
                {col.label}
                {active ? (
                  sortDir === 'asc' ? (
                    <ArrowUp size={12} />
                  ) : (
                    <ArrowDown size={12} />
                  )
                ) : (
                  <ChevronsUpDown
                    size={12}
                    className="opacity-0 transition-opacity group-hover:opacity-50"
                  />
                )}
              </button>
            </th>
          )
        })}
        {children}
      </tr>
    </thead>
  )
}
