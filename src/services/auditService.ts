import { getSupabaseClient } from '../lib/supabaseClient'
import type { AuditLog } from '../types/audit'

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

/** Audit-log read + super-admin revert operations. */
export const auditService = {
  async list(limit = 200, offset = 0): Promise<AuditLog[]> {
    const { data, error } = await client().rpc('admin_list_audit_logs', {
      lim: limit,
      off: offset,
    })
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown>[]).map(r => ({
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
    }))
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
