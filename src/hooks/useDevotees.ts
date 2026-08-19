import { useCallback, useEffect, useState } from 'react'
import type {
  Devotee,
  CreateDevoteeInput,
  UpdateDevoteeInput,
} from '../types/devotee'
import { devoteesService } from '../services/devoteesService'
import { useServerTable, type ServerTableParams } from './useServerTable'

const ALL = 'All'
export type DevoteeStatusFilter = 'all' | 'active' | 'blocked'

/**
 * Devotees list + mutations, paged on the SERVER.
 *
 * Search, nakshatram, status, date range, sort and pagination are all pushed
 * into `admin_list_devotees_page`, so the page holds at most one page of rows
 * however large the mission grows.
 */
export function useDevotees(pageSize = 15) {
  const [nakshatram, setNakshatramRaw] = useState<string>(ALL)
  const [status, setStatusRaw] = useState<DevoteeStatusFilter>('all')
  const [nakshatramOptions, setNakshatramOptions] = useState<string[]>([ALL])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetcher = useCallback(
    (p: ServerTableParams) =>
      devoteesService.page({
        query: p.query,
        nakshatram,
        status,
        from: p.from,
        to: p.to,
        sortKey: p.sortKey,
        sortDir: p.sortDir,
        page: p.page,
        pageSize: p.pageSize,
      }),
    [nakshatram, status],
  )

  const table = useServerTable<Devotee>(fetcher, {
    initialSortKey: 'registered',
    initialSortDir: 'desc',
    pageSize,
  })

  const { setPage, refresh } = table

  // Filter options come from their own tiny RPC rather than from the rows on
  // screen — a page of 15 would only ever show 15 nakshatrams.
  useEffect(() => {
    let active = true
    devoteesService
      .nakshatrams()
      .then(list => active && setNakshatramOptions([ALL, ...list]))
      .catch(() => {
        /* the filter just stays at "All" */
      })
    return () => {
      active = false
    }
  }, [])

  const setNakshatram = useCallback(
    (value: string) => {
      setNakshatramRaw(value)
      setPage(1)
    },
    [setPage],
  )

  const setStatus = useCallback(
    (value: DevoteeStatusFilter) => {
      setStatusRaw(value)
      setPage(1)
    },
    [setPage],
  )

  const create = useCallback(
    async (input: CreateDevoteeInput): Promise<string | null> => {
      try {
        await devoteesService.create(input)
        await refresh()
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to create devotee.'
      }
    },
    [refresh],
  )

  const update = useCallback(
    async (id: string, input: UpdateDevoteeInput): Promise<string | null> => {
      try {
        await devoteesService.update(id, input)
        await refresh()
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to update devotee.'
      }
    },
    [refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      setDeletingId(id)
      setActionError(null)
      try {
        await devoteesService.remove(id)
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete devotee.'
        setActionError(message)
        throw err
      } finally {
        setDeletingId(null)
      }
    },
    [refresh],
  )

  const setBlocked = useCallback(
    async (id: string, blocked: boolean) => {
      setActionError(null)
      try {
        await devoteesService.setBlocked(id, blocked)
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update devotee.'
        setActionError(message)
        throw err
      }
    },
    [refresh],
  )

  return {
    ...table,
    devotees: table.rows,
    error: table.error ?? actionError,
    nakshatram,
    setNakshatram,
    nakshatramOptions,
    status,
    setStatus,
    deletingId,
    create,
    update,
    remove,
    setBlocked,
  }
}
