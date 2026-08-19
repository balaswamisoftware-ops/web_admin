import { getSupabaseClient } from '../lib/supabaseClient'
import type { AuditLog } from '../types/audit'

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

type Row = Record<string, unknown>

function mapLog(r: Row): AuditLog {
  return {
    id: r.id as string,
    actorName: (r.actor_name as string) ?? '—',
    actorEmail: (r.actor_email as string) ?? '',
    action: r.action as string,
    entityType: r.entity_type as string,
    entityId: (r.entity_id as string) ?? null,
    summary: (r.summary as string) ?? '',
    revertible: Boolean(r.revertible),
    reverted: Boolean(r.reverted),
    revertedByName: (r.reverted_by_name as string) ?? null,
    revertedAt: (r.reverted_at as string) ?? null,
    revertOf: (r.revert_of as string) ?? null,
    createdAt: r.created_at as string,
  }
}

/** Filters the audit feed supports server-side. */
export interface AuditQuery {
  query?: string
  /** Action family: chant | donation | settings | devotee | admin | notification. */
  family?: string
  /** Exact actor name, '' for any. */
  actor?: string
  from?: string | null
  to?: string | null
  page?: number
  pageSize?: number
}

/** Audit-log read + super-admin revert operations. */
export const auditService = {
  /** One filtered page of the audit feed, counted by the server. */
  async page(q: AuditQuery = {}): Promise<{ rows: AuditLog[]; total: number }> {
    const pageSize = q.pageSize ?? 12
    const { data, error } = await client().rpc('admin_list_audit_logs_v2', {
      q: q.query ?? '',
      family: q.family ?? 'all',
      actor: q.actor ?? '',
      from_date: q.from ?? null,
      to_date: q.to ?? null,
      lim: pageSize,
      off: ((q.page ?? 1) - 1) * pageSize,
    })
    if (error) throw new Error(error.message)
    const rows = (data as Row[]) ?? []
    return {
      rows: rows.map(mapLog),
      total: rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0,
    }
  },

  /** Admins who have ever acted, with their entry counts. */
  async actors(): Promise<{ name: string; entries: number }[]> {
    const { data, error } = await client().rpc('admin_audit_actors')
    if (error) throw new Error(error.message)
    return ((data as Row[]) ?? []).map(r => ({
      name: String(r.actor_name ?? ''),
      entries: Number(r.entries ?? 0),
    }))
  },

  /** Unpaged read used by the CSV export (respects the same filters). */
  async list(limit = 200, offset = 0): Promise<AuditLog[]> {
    const { data, error } = await client().rpc('admin_list_audit_logs', {
      lim: limit,
      off: offset,
    })
    if (error) throw new Error(error.message)
    return (data as Row[]).map(mapLog)
  },

  /** Revert a single revertible log entry (super admin only). */
  async revert(logId: string): Promise<void> {
    const { error } = await client().rpc('admin_revert_log', { log_id: logId })
    if (error) throw new Error(error.message)
  },

  /** Record a non-revertible audit entry for an edge-function op. Best-effort. */
  async logEvent(
    action: string,
    entityType: string,
    entityId: string | null,
    summary: string,
  ): Promise<void> {
    const { error } = await client().rpc('admin_log_event', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_summary: summary,
    })
    if (error) throw new Error(error.message)
  },
}
