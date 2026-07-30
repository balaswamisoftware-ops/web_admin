import { useCallback, useEffect, useState } from 'react'
import type { DashboardStats } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'

/** Loads the mission dashboard aggregates (chants, donations, pending, …). */
export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStats(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setStats(await missionAdminService.dashboardStats())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { stats, loading, error, refresh: load }
}
