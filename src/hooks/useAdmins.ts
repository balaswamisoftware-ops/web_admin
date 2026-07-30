import { useCallback, useEffect, useState } from 'react'
import type { AdminListItem, CreateAdminInput } from '../types/admin'
import { adminsService } from '../services/adminsService'

export function useAdmins() {
  const [admins, setAdmins] = useState<AdminListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAdmins(await adminsService.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admins.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const create = useCallback(
    async (input: CreateAdminInput): Promise<string | null> => {
      try {
        await adminsService.create(input)
        await load()
        return null
      } catch (err) {
        return err instanceof Error ? err.message : 'Failed to create admin.'
      }
    },
    [load],
  )

  const remove = useCallback(
    async (userId: string) => {
      setBusyId(userId)
      try {
        await adminsService.remove(userId)
        setAdmins(prev => prev.filter(a => a.userId !== userId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete admin.')
      } finally {
        setBusyId(null)
      }
    },
    [],
  )

  const setSuperAdmin = useCallback(
    async (userId: string, value: boolean) => {
      setBusyId(userId)
      try {
        await adminsService.setSuperAdmin(userId, value)
        setAdmins(prev =>
          prev.map(a => (a.userId === userId ? { ...a, isSuperAdmin: value } : a)),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update role.')
      } finally {
        setBusyId(null)
      }
    },
    [],
  )

  return {
    admins,
    loading,
    error,
    busyId,
    refresh: load,
    create,
    remove,
    setSuperAdmin,
  }
}
