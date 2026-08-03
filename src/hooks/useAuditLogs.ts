import { useCallback, useEffect, useState } from 'react'
import { auditService } from '../services/auditService'
import type { AuditLog } from '../types/audit'

/** Loads the audit log and exposes a super-admin revert action. */
export function useAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revertingId, setRevertingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLogs(await auditService.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const revert = useCallback(
    async (id: string) => {
      setRevertingId(id)
      setError(null)
      try {
        await auditService.revert(id)
        await refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to revert.')
        throw e
      } finally {
        setRevertingId(null)
      }
    },
    [refresh],
  )

  return { logs, loading, error, refresh, revert, revertingId }
}
