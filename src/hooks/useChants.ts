import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChantEntry } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'

export function useChants() {
  const [chants, setChants] = useState<ChantEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setChants(await missionAdminService.listChants())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chants.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setCount = useCallback(async (userId: string, count: number) => {
    setBusyId(userId)
    try {
      await missionAdminService.setChantCount(userId, count)
      setChants(prev =>
        prev
          .map(c => (c.userId === userId ? { ...c, count } : c))
          .sort((a, b) => b.count - a.count),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update count.')
    } finally {
      setBusyId(null)
    }
  }, [])

  const total = useMemo(() => chants.reduce((sum, c) => sum + c.count, 0), [chants])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return chants
    return chants.filter(
      c => c.fullName.toLowerCase().includes(q) || c.mobile.includes(q),
    )
  }, [chants, query])

  return {
    chants: filtered,
    total,
    contributors: chants.length,
    loading,
    error,
    busyId,
    query,
    setQuery,
    refresh: load,
    setCount,
  }
}
