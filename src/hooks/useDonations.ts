import { useCallback, useEffect, useState } from 'react'
import type { Donation, DonationCounts, DonationStatus } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'
import { useServerTable, type ServerTableParams } from './useServerTable'

/** 'flagged' is not a stored status — it means "shares a UPI ref with another". */
export type DonationFilter = 'all' | DonationStatus | 'flagged'

const EMPTY_COUNTS: DonationCounts = {
  all: 0,
  pending: 0,
  verified: 0,
  completed: 0,
  rejected: 0,
  flagged: 0,
}

/**
 * The payment verification queue.
 *
 * Defaults to the 'queue' sort — pending first, duplicate-txn rows ahead of the
 * rest, oldest first — so opening the page lands the admin on the work that
 * actually needs a decision.
 */
export function useDonations(pageSize = 15) {
  const [filter, setFilterRaw] = useState<DonationFilter>('all')
  const [counts, setCounts] = useState<DonationCounts>(EMPTY_COUNTS)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetcher = useCallback(
    (p: ServerTableParams) =>
      missionAdminService.listDonationsPage({
        query: p.query,
        status: filter,
        from: p.from,
        to: p.to,
        sortKey: p.sortKey,
        sortDir: p.sortDir,
        page: p.page,
        pageSize: p.pageSize,
      }),
    [filter],
  )

  const table = useServerTable<Donation>(fetcher, {
    initialSortKey: 'queue',
    initialSortDir: 'asc',
    pageSize,
    enabled: isSupabaseConfigured,
  })

  const { refresh, setPage } = table

  const loadCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return
    try {
      setCounts(await missionAdminService.donationCounts())
    } catch {
      /* the chips just show no numbers */
    }
  }, [])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  const setFilter = useCallback(
    (value: DonationFilter) => {
      setFilterRaw(value)
      setPage(1)
    },
    [setPage],
  )

  const reload = useCallback(async () => {
    await Promise.all([refresh(), loadCounts()])
  }, [refresh, loadCounts])

  const update = useCallback(
    async (id: string, status: DonationStatus, remarks: string) => {
      setBusyId(id)
      setActionError(null)
      try {
        await missionAdminService.updateDonation(id, status, remarks)
        await reload()
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to update donation.'
        setActionError(message)
        throw err
      } finally {
        setBusyId(null)
      }
    },
    [reload],
  )

  const bulkUpdate = useCallback(
    async (ids: string[], status: DonationStatus, remarks = '') => {
      setBulkBusy(true)
      setActionError(null)
      try {
        const n = await missionAdminService.bulkUpdateDonations(ids, status, remarks)
        await reload()
        return n
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Bulk update failed.'
        setActionError(message)
        throw err
      } finally {
        setBulkBusy(false)
      }
    },
    [reload],
  )

  return {
    ...table,
    donations: table.rows,
    error: table.error ?? actionError,
    counts,
    filter,
    setFilter,
    busyId,
    bulkBusy,
    update,
    bulkUpdate,
    refresh: reload,
  }
}
