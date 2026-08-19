import { useCallback, useState } from 'react'
import type { ChantEntry } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'
import { useServerTable, type ServerTableParams } from './useServerTable'

/** Chant counts, paged/sorted/searched by `admin_list_chants_page`. */
export function useChants(pageSize = 15) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetcher = useCallback(
    (p: ServerTableParams) =>
      missionAdminService.listChantsPage({
        query: p.query,
        from: p.from,
        to: p.to,
        sortKey: p.sortKey,
        sortDir: p.sortDir,
        page: p.page,
        pageSize: p.pageSize,
      }),
    [],
  )

  const table = useServerTable<ChantEntry>(fetcher, {
    initialSortKey: 'chants',
    initialSortDir: 'desc',
    pageSize,
    enabled: isSupabaseConfigured,
  })

  const { refresh } = table

  const setCount = useCallback(
    async (userId: string, count: number) => {
      setBusyId(userId)
      setActionError(null)
      try {
        await missionAdminService.setChantCount(userId, count)
        await refresh()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update count.'
        setActionError(message)
        throw err
      } finally {
        setBusyId(null)
      }
    },
    [refresh],
  )

  return {
    ...table,
    chants: table.rows,
    error: table.error ?? actionError,
    busyId,
    setCount,
  }
}
