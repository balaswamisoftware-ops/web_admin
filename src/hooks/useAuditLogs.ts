import { useCallback, useEffect, useState } from 'react'
import { auditService } from '../services/auditService'
import type { AuditLog } from '../types/audit'
import { isSupabaseConfigured } from '../config/env'
import { useServerTable, type ServerTableParams } from './useServerTable'

export const AUDIT_FAMILIES = [
  'all',
  'chant',
  'donation',
  'settings',
  'devotee',
  'admin',
  'notification',
] as const
export type AuditFamily = (typeof AUDIT_FAMILIES)[number]

/**
 * The audit feed with server-side search, action-family, per-admin and date
 * filters, plus the super-admin revert action.
 */
export function useAuditLogs(pageSize = 12) {
  const [family, setFamilyRaw] = useState<AuditFamily>('all')
  const [actor, setActorRaw] = useState('')
  const [actors, setActors] = useState<{ name: string; entries: number }[]>([])
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetcher = useCallback(
    (p: ServerTableParams) =>
      auditService.page({
        query: p.query,
        family,
        actor,
        from: p.from,
        to: p.to,
        page: p.page,
        pageSize: p.pageSize,
      }),
    [family, actor],
  )

  const table = useServerTable<AuditLog>(fetcher, {
    initialSortKey: 'created',
    initialSortDir: 'desc',
    pageSize,
    enabled: isSupabaseConfigured,
  })

  const { refresh, setPage } = table

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    auditService
      .actors()
      .then(list => active && setActors(list))
      .catch(() => {
        /* the actor filter just stays empty */
      })
    return () => {
      active = false
    }
  }, [])

  const setFamily = useCallback(
    (value: AuditFamily) => {
      setFamilyRaw(value)
      setPage(1)
    },
    [setPage],
  )

  const setActor = useCallback(
    (value: string) => {
      setActorRaw(value)
      setPage(1)
    },
    [setPage],
  )

  const revert = useCallback(
    async (id: string) => {
      setRevertingId(id)
      setActionError(null)
      try {
        await auditService.revert(id)
        await refresh()
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to revert.'
        setActionError(message)
        throw e
      } finally {
        setRevertingId(null)
      }
    },
    [refresh],
  )

  /** Every row matching the CURRENT filters, for the CSV export. */
  const exportRows = useCallback(async (): Promise<AuditLog[]> => {
    const { rows } = await auditService.page({
      query: table.params.query,
      family,
      actor,
      from: table.params.from,
      to: table.params.to,
      page: 1,
      pageSize: 5000,
    })
    return rows
  }, [family, actor, table.params])

  return {
    ...table,
    logs: table.rows,
    error: table.error ?? actionError,
    family,
    setFamily,
    actor,
    setActor,
    actors,
    revert,
    revertingId,
    exportRows,
  }
}
