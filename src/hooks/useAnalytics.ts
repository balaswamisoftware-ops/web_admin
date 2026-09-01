import { useCallback, useEffect, useState } from 'react'
import type { Analytics } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { isSupabaseConfigured } from '../config/env'
import { COMMUNITY_CHANT_TARGET } from '../constants/mission'

/**
 * Mission analytics: daily chant volume, the registration→donation funnel and
 * the projected date the community goal is reached at the current rate.
 */
export function useAnalytics(days = 30) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  // The admin can change the community goal, so it is read before the
  // projection rather than compiled in. The constant is the fallback only.
  const [communityTarget, setCommunityTarget] = useState(COMMUNITY_CHANT_TARGET)
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
      const target = await missionAdminService
        .communityTarget()
        .catch(() => COMMUNITY_CHANT_TARGET)
      setCommunityTarget(target)
      setAnalytics(await missionAdminService.analytics(days, target))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void load()
  }, [load])

  return { analytics, communityTarget, loading, error, refresh: load }
}
