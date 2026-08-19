import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_RANGE, isRangeInvalid, rangeEnd, rangeStart, type DateRange } from '../lib/dateRange'

export type SortDir = 'asc' | 'desc'

/** What the hook hands the fetcher on every load. */
export interface ServerTableParams {
  /** Debounced search text (already trimmed). */
  query: string
  sortKey: string
  sortDir: SortDir
  /** 1-based. */
  page: number
  pageSize: number
  /** ISO instant, or null when the range is open-ended. */
  from: string | null
  /** ISO instant, EXCLUSIVE upper bound, or null. */
  to: string | null
}

export interface ServerPage<T> {
  rows: T[]
  /** Size of the filtered set on the server, not of this page. */
  total: number
}

interface Options {
  initialSortKey: string
  initialSortDir?: SortDir
  pageSize?: number
  /** Set false to hold off loading (e.g. Supabase not configured). */
  enabled?: boolean
  /** Debounce applied to the search box before it hits the server. */
  debounceMs?: number
}

/**
 * Server-side table controls: search + sort + pagination + date range, with the
 * heavy lifting done by an RPC instead of by downloading every row.
 *
 * `fetcher` MUST be stable (wrap it in `useCallback` with your filter deps) —
 * the hook reloads whenever it changes, which is exactly how a page pushes a
 * new filter value in.
 */
export function useServerTable<T>(
  fetcher: (params: ServerTableParams) => Promise<ServerPage<T>>,
  opts: Options,
) {
  const {
    initialSortKey,
    initialSortDir = 'desc',
    pageSize = 15,
    enabled = true,
    debounceMs = 300,
  } = opts

  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const [query, setQueryRaw] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sortKey, setSortKey] = useState(initialSortKey)
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir)
  const [page, setPage] = useState(1)
  const [range, setRangeRaw] = useState<DateRange>(EMPTY_RANGE)

  // Only the newest request may write state — filters change faster than the
  // network answers, and a slow earlier page must not overwrite a newer one.
  const requestRef = useRef(0)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), debounceMs)
    return () => clearTimeout(id)
  }, [query, debounceMs])

  // Any narrowing control returns to page 1, otherwise you land on an empty page.
  const setQuery = useCallback((q: string) => {
    setQueryRaw(q)
    setPage(1)
  }, [])

  const setRange = useCallback((r: DateRange) => {
    setRangeRaw(r)
    setPage(1)
  }, [])

  const toggleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
    setPage(1)
  }, [])

  const rangeBroken = isRangeInvalid(range)

  const load = useCallback(async () => {
    if (!enabled) {
      setRows([])
      setTotal(0)
      setLoading(false)
      return
    }
    if (rangeBroken) {
      setRows([])
      setTotal(0)
      setLoading(false)
      return
    }
    const id = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher({
        query: debouncedQuery,
        sortKey,
        sortDir,
        page,
        pageSize,
        from: rangeStart(range),
        to: rangeEnd(range),
      })
      if (id !== requestRef.current) return
      setRows(result.rows)
      setTotal(result.total)
    } catch (e) {
      if (id !== requestRef.current) return
      setError(e instanceof Error ? e.message : 'Failed to load.')
      setRows([])
      setTotal(0)
    } finally {
      if (id === requestRef.current) setLoading(false)
    }
  }, [enabled, rangeBroken, fetcher, debouncedQuery, sortKey, sortDir, page, pageSize, range])

  useEffect(() => {
    void load()
  }, [load])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  // A delete on the last row of the last page would otherwise strand the pager.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return useMemo(
    () => ({
      rows,
      total,
      loading,
      error,
      query,
      setQuery,
      sortKey,
      sortDir,
      toggleSort,
      page,
      setPage,
      pageCount,
      pageSize,
      from,
      to,
      range,
      setRange,
      rangeBroken,
      refresh: load,
      /** Params the table is currently showing — handy for "export what I see". */
      params: {
        query: debouncedQuery,
        sortKey,
        sortDir,
        page,
        pageSize,
        from: rangeStart(range),
        to: rangeEnd(range),
      } as ServerTableParams,
    }),
    [
      rows, total, loading, error, query, setQuery, sortKey, sortDir, toggleSort,
      page, pageCount, pageSize, from, to, range, setRange, rangeBroken, load,
      debouncedQuery,
    ],
  )
}
