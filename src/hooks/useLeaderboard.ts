import { useCallback, useEffect, useState } from 'react'
import type { LeaderboardEntry, Milestones } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'

/** Top chanters + milestone tiers + the devotees who finished their goal. */
export function useLeaderboard(pageSize = 25) {
  const [rows, setRows] = useState<LeaderboardEntry[]>([])
  const [total, setTotal] = useState(0)
  const [milestones, setMilestones] = useState<Milestones | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [board, tiers] = await Promise.all([
        missionAdminService.leaderboard(pageSize, page),
        missionAdminService.milestones(),
      ])
      setRows(board.rows)
      setTotal(board.total)
      setMilestones(tiers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the leaderboard.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return {
    rows,
    total,
    milestones,
    page,
    setPage,
    pageCount,
    pageSize,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    loading,
    error,
    refresh: load,
  }
}
