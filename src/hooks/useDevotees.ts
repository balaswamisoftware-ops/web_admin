import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Devotee,
  CreateDevoteeInput,
  UpdateDevoteeInput,
} from '../types/devotee'
import { devoteesService } from '../services/devoteesService'

const ALL = 'All'

/**
 * Loads devotees and exposes client-side search + nakshatram filtering and
 * delete. Keeps all list logic out of the UI component.
 */
export function useDevotees() {
  const [devotees, setDevotees] = useState<Devotee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [nakshatram, setNakshatram] = useState<string>(ALL)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDevotees(await devoteesService.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load devotees.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(
    async (input: CreateDevoteeInput): Promise<string | null> => {
      try {
        await devoteesService.create(input)
        await load()
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to create devotee.'
      }
    },
    [load],
  )

  const update = useCallback(
    async (id: string, input: UpdateDevoteeInput): Promise<string | null> => {
      try {
        await devoteesService.update(id, input)
        await load()
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to update devotee.'
      }
    },
    [load],
  )

  const remove = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await devoteesService.remove(id)
      setDevotees(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete devotee.')
    } finally {
      setDeletingId(null)
    }
  }, [])

  const setBlocked = useCallback(async (id: string, blocked: boolean) => {
    // Optimistic toggle.
    setDevotees(prev =>
      prev.map(d => (d.id === id ? { ...d, isBlocked: blocked } : d)),
    )
    try {
      await devoteesService.setBlocked(id, blocked)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update devotee.')
      setDevotees(prev =>
        prev.map(d => (d.id === id ? { ...d, isBlocked: !blocked } : d)),
      )
    }
  }, [])

  /** Distinct nakshatrams present, for the filter dropdown. */
  const nakshatramOptions = useMemo(
    () => [ALL, ...Array.from(new Set(devotees.map(d => d.nakshatram))).sort()],
    [devotees],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return devotees.filter(d => {
      const matchesQuery =
        !q ||
        d.fullName.toLowerCase().includes(q) ||
        d.mobile.includes(q) ||
        d.gothram.toLowerCase().includes(q)
      const matchesNakshatram =
        nakshatram === ALL || d.nakshatram === nakshatram
      return matchesQuery && matchesNakshatram
    })
  }, [devotees, query, nakshatram])

  return {
    devotees: filtered,
    total: devotees.length,
    loading,
    error,
    deletingId,
    query,
    setQuery,
    nakshatram,
    setNakshatram,
    nakshatramOptions,
    refresh: load,
    create,
    update,
    remove,
    setBlocked,
  }
}
