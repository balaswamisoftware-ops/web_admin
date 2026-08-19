import { useCallback, useEffect, useState } from 'react'
import type { Analytics } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'

/**
 * Mission analytics: daily chant volume, the registration→donation funnel and
 * the projected date the community goal is reached at the current rate.
 */
export function useAnalytics(days = 30) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setAnalytics(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setAnalytics(await missionAdminService.analytics(days))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  return { analytics, loading, error, refresh: load }
}
