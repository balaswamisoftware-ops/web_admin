import { getSupabaseClient } from '../lib/supabaseClient'
import { parseLevels } from '../lib/levels'
import type {
  DevoteeAdminDetail,
  DevoteeAdminsOverview,
  DevoteeCandidate,
  GroupEntry,
} from '../types/devoteeAdmin'

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

type Row = Record<string, unknown>

const num = (v: unknown) => Number(v ?? 0) || 0
const str = (v: unknown) => (v == null ? '' : String(v))
const strOrNull = (v: unknown) => (v == null ? null : String(v))

/**
 * Devotee Admins, as seen from the portal. Every rule (who can be appointed,
 * who can join a group, audit) lives in the SQL functions in
 * `devotee-admins.sql`; this layer only maps shapes.
 */
export const devoteeAdminsService = {
  async overview(): Promise<DevoteeAdminsOverview> {
    const { data, error } = await client().rpc('admin_devotee_admins_overview')
    if (error) throw new Error(error.message)
    const d = (data ?? {}) as { summary?: Row; admins?: Row[] }
    const s = d.summary ?? {}
    return {
      summary: {
        admins: num(s.admins),
        active: num(s.active),
        members: num(s.members),
        groupChants: num(s.groupChants),
        entered7d: num(s.entered7d),
      },
      admins: (d.admins ?? []).map(a => ({
        userId: str(a.userId),
        devoteeId: strOrNull(a.devoteeId),
        fullName: str(a.fullName) || 'Unknown devotee',
        mobile: str(a.mobile),
        isActive: a.isActive === true,
        appointedAt: str(a.appointedAt),
        appointedByName: strOrNull(a.appointedByName),
        suspendedAt: strOrNull(a.suspendedAt),
        members: num(a.members),
        groupChants: num(a.groupChants),
        entered7d: num(a.entered7d),
        enteredTotal: num(a.enteredTotal),
        lastEntryAt: strOrNull(a.lastEntryAt),
      })),
    }
  },

  async detail(userId: string): Promise<DevoteeAdminDetail> {
    const { data, error } = await client().rpc('admin_devotee_admin_detail', {
      p_user_id: userId,
    })
    if (error) throw new Error(error.message)
    const d = (data ?? {}) as {
      admin?: Row
      levels?: unknown
      members?: Row[]
      entries?: Row[]
      daily?: Row[]
    }
    const a = d.admin ?? {}
    return {
      admin: {
        userId: str(a.userId),
        devoteeId: strOrNull(a.devoteeId),
        fullName: str(a.fullName) || 'Unknown devotee',
        mobile: str(a.mobile),
        nakshatram: str(a.nakshatram),
        gothram: str(a.gothram),
        isActive: a.isActive === true,
        appointedAt: str(a.appointedAt),
        appointedByName: strOrNull(a.appointedByName),
        suspendedAt: strOrNull(a.suspendedAt),
        ownCount: num(a.ownCount),
      },
      levels: parseLevels(d.levels),
      members: (d.members ?? []).map(m => ({
        devoteeId: str(m.devoteeId),
        userId: str(m.userId),
        fullName: str(m.fullName),
        mobile: str(m.mobile),
        nakshatram: str(m.nakshatram),
        gothram: str(m.gothram),
        isBlocked: m.isBlocked === true,
        count: num(m.count),
        enteredByAdmin: num(m.enteredByAdmin),
        managedSince: strOrNull(m.managedSince),
        createdAt: str(m.createdAt),
        lastEntryAt: strOrNull(m.lastEntryAt),
      })),
      entries: (d.entries ?? []).map(
        (e): GroupEntry => ({
          logId: str(e.logId),
          memberName: strOrNull(e.memberName),
          memberMobile: strOrNull(e.memberMobile),
          amount: num(e.amount),
          createdAt: str(e.created_at),
          undoneAt: strOrNull(e.undoneAt),
        }),
      ),
      daily: (d.daily ?? []).map(x => ({ day: str(x.day), chants: num(x.chants) })),
    }
  },

  /** Devotees matching a name or mobile fragment (min 2 characters). */
  async candidates(search: string): Promise<DevoteeCandidate[]> {
    const { data, error } = await client().rpc('admin_devotee_admin_candidates', {
      p_search: search,
    })
    if (error) throw new Error(error.message)
    return ((data as Row[]) ?? []).map(r => ({
      devoteeId: str(r.devotee_id),
      userId: strOrNull(r.user_id),
      fullName: str(r.full_name),
      mobile: str(r.mobile),
      isBlocked: r.is_blocked === true,
      isDevoteeAdmin: r.is_devotee_admin === true,
      managerUserId: strOrNull(r.manager_user_id),
      managerName: strOrNull(r.manager_name),
    }))
  },

  async appoint(devoteeId: string): Promise<void> {
    const { error } = await client().rpc('admin_appoint_devotee_admin', {
      p_devotee_id: devoteeId,
    })
    if (error) throw new Error(error.message)
  },

  async setActive(userId: string, active: boolean): Promise<void> {
    const { error } = await client().rpc('admin_set_devotee_admin_active', {
      p_user_id: userId,
      p_active: active,
    })
    if (error) throw new Error(error.message)
  },

  /** Removes the role; returns how many members were released. */
  async revoke(userId: string): Promise<number> {
    const { data, error } = await client().rpc('admin_revoke_devotee_admin', {
      p_user_id: userId,
    })
    if (error) throw new Error(error.message)
    return num(data)
  },

  /** Add to / move into a group, or pass `managerUserId: null` to remove. */
  async setGroup(devoteeId: string, managerUserId: string | null): Promise<void> {
    const { error } = await client().rpc('admin_set_devotee_group', {
      p_devotee_id: devoteeId,
      p_manager: managerUserId,
    })
    if (error) throw new Error(error.message)
  },
}
