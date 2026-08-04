import { useMemo, useState } from 'react'

export type SortDir = 'asc' | 'desc'

interface Options<T> {
  /** Predicate for the search box; return true to keep the row. */
  search?: (row: T, query: string) => boolean
  /** Per-sort-key accessors returning a comparable value. */
  sortAccessors?: Record<string, (row: T) => string | number>
  initialSortKey?: string
  initialSortDir?: SortDir
  pageSize?: number
}

/**
 * Generic client-side table controls: search + column sort + pagination over an
 * in-memory array. Returns the current page slice plus everything the UI needs
 * to render a search box, sortable headers and a pager.
 */
export function useTableControls<T>(rows: T[], opts: Options<T> = {}) {
  const { search, sortAccessors, initialSortKey, initialSortDir = 'asc', pageSize = 20 } = opts

  const [query, setQueryRaw] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey ?? null)
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir)
  const [page, setPage] = useState(1)

  // Any control change that shrinks the list should return to page 1.
  const setQuery = (q: string) => {
    setQueryRaw(q)
    setPage(1)
  }
  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !search) return rows
    return rows.filter(r => search(r, q))
  }, [rows, query, search])

  const sorted = useMemo(() => {
    if (!sortKey || !sortAccessors?.[sortKey]) return filtered
    const accessor = sortAccessors[sortKey]
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const va = accessor(a)
      const vb = accessor(b)
      if (va < vb) return -1 * dir
      if (va > vb) return 1 * dir
      return 0
    })
  }, [filtered, sortKey, sortDir, sortAccessors])

  const total = sorted.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * pageSize
  const pageRows = useMemo(
    () => sorted.slice(start, start + pageSize),
    [sorted, start, pageSize],
  )

  return {
    pageRows,
    query,
    setQuery,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    pageCount,
    pageSize,
    total,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, total),
  }
}
