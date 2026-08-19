import { useCallback, useEffect, useState } from 'react'
import type { DevoteeDetail } from '../types/devotee'
import { devoteesService } from '../services/devoteesService'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'

/**
 * Loads everything the 360° drawer shows for one devotee, and exposes the
 * actions the drawer offers (adjust chants, block, verify a donation) so an
 * admin never has to leave it to finish a task.
 *
 * `devoteeId` may be null (drawer closed) — nothing is fetched then.
 */
export function useDevoteeDetail(devoteeId: string | null) {
  const [detail, setDetail] = useState<DevoteeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!devoteeId) {
      setDetail(null)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setDetail(await devoteesService.detail(devoteeId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load devotee.')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [devoteeId])

  useEffect(() => {
    void load()
  }, [load])

  const setChantCount = useCallback(
    async (count: number) => {
      const userId = detail?.devotee.userId
      if (!userId) throw new Error('This devotee has no linked login yet.')
      setBusy(true)
      try {
        await missionAdminService.setChantCount(userId, count)
        await load()
      } finally {
        setBusy(false)
      }
    },
    [detail, load],
  )

  const setBlocked = useCallback(
    async (blocked: boolean) => {
      if (!devoteeId) return
      setBusy(true)
      try {
        await devoteesService.setBlocked(devoteeId, blocked)
        await load()
      } finally {
        setBusy(false)
      }
    },
    [devoteeId, load],
  )

  const updateDonation = useCallback(
    async (id: string, status: 'verified' | 'rejected' | 'completed', remarks = '') => {
      setBusy(true)
      try {
        await missionAdminService.updateDonation(id, status, remarks)
        await load()
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  return {
    detail,
    loading,
    error,
    busy,
    /** Chant history is only available with a real backend. */
    hasHistory: isSupabaseConfigured,
    refresh: load,
    setChantCount,
    setBlocked,
    updateDonation,
  }
}
