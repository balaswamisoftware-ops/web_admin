import type {
  Devotee,
  DevoteeDetail,
  DevoteePage,
  DevoteeQuery,
  CreateDevoteeInput,
  UpdateDevoteeInput,
} from '../types/devotee'
import { DEVOTEES_TABLE } from '../config/env'
import { getSupabaseClient } from '../lib/supabaseClient'
import { invokeWithRetry } from '../lib/invokeWithRetry'
import { auditService } from './auditService'
import type { DevoteesService } from './devoteesService'

/** Log an edge-function op to the audit trail; never block the op if it fails. */
function audit(action: string, id: string | null, summary: string) {
  void auditService.logEvent(action, 'devotees', id, summary).catch(() => {})
}

interface DevoteeRow {
  id: string
  user_id?: string | null
  full_name: string
  mobile: string
  nakshatram: string
  gothram: string
  created_at: string
  is_blocked: boolean | null
  chant_count?: number | null
  donation_status?: string | null
  total_count?: number | null
}

function mapRow(row: DevoteeRow): Devotee {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    fullName: row.full_name,
    mobile: row.mobile,
    nakshatram: row.nakshatram,
    gothram: row.gothram,
    createdAt: row.created_at,
    isBlocked: Boolean(row.is_blocked),
    chantCount: row.chant_count ?? 0,
    donationStatus: row.donation_status ?? null,
  }
}

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured.')
  return client
}

/** Invoke the `devotees-admin` Edge Function (auth-touching mutations). */
async function invokeAdmin(body: Record<string, unknown>) {
  const supabase = requireClient()
  await invokeWithRetry(supabase, 'devotees-admin', body)
}

/**
 * Supabase-backed devotees. Reads the same `devotees` table the mobile app
 * writes to on sign-up, so every registered user appears here automatically.
 * Mutations that also touch the devotee's login (create / update / delete) go
 * through the `devotees-admin` Edge Function so the secret key stays server-side.
 */
export const supabaseDevoteesService: DevoteesService = {
  async page(query: DevoteeQuery): Promise<DevoteePage> {
    const supabase = requireClient()
    const pageSize = query.pageSize ?? 15
    const { data, error } = await supabase.rpc('admin_list_devotees_page', {
      q: query.query ?? '',
      nak: query.nakshatram && query.nakshatram !== 'All' ? query.nakshatram : '',
      status_f: query.status ?? 'all',
      from_date: query.from ?? null,
      to_date: query.to ?? null,
      sort_key: query.sortKey ?? 'registered',
      sort_dir: query.sortDir ?? 'desc',
      lim: pageSize,
      off: ((query.page ?? 1) - 1) * pageSize,
    })
    if (error) throw new Error(error.message)
    const rows = (data as DevoteeRow[]) ?? []
    return {
      rows: rows.map(mapRow),
      // `total_count` is the filtered-set size, repeated on every row.
      total: rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0,
    }
  },

  async nakshatrams() {
    const supabase = requireClient()
    const { data, error } = await supabase.rpc('admin_devotee_nakshatrams')
    if (error) throw new Error(error.message)
    return ((data as { nakshatram: string }[]) ?? []).map(r => r.nakshatram)
  },

  async detail(id: string): Promise<DevoteeDetail> {
    const supabase = requireClient()
    const { data, error } = await supabase.rpc('admin_devotee_detail', {
      devotee_id: id,
    })
    if (error) throw new Error(error.message)
    const d = data as {
      devotee: DevoteeDetail['devotee']
      chantCount: number
      rank: number | null
      target: number
      firstChantAt: string | null
      lastChantAt: string | null
      activeDays: number
      logs: { id: string; amount: number; kind: string; created_at: string }[]
      donations: Record<string, unknown>[]
      adminActions: Record<string, unknown>[]
    }
    return {
      devotee: d.devotee,
      chantCount: d.chantCount ?? 0,
      rank: d.rank ?? null,
      target: d.target ?? 100000,
      firstChantAt: d.firstChantAt ?? null,
      lastChantAt: d.lastChantAt ?? null,
      activeDays: Number(d.activeDays ?? 0),
      logs: (d.logs ?? []).map(l => ({
        id: l.id,
        amount: Number(l.amount),
        kind: (l.kind as 'add' | 'reset' | 'adjust') ?? 'add',
        createdAt: l.created_at,
      })),
      donations: (d.donations ?? []).map(r => ({
        id: r.id as string,
        amount: Number(r.amount ?? 0),
        upiTxnId: (r.upi_txn_id as string) ?? null,
        screenshotUrl: (r.screenshot_url as string) ?? null,
        status: String(r.status ?? 'pending'),
        adminRemarks: (r.admin_remarks as string) ?? null,
        createdAt: r.created_at as string,
        verifiedAt: (r.verified_at as string) ?? null,
      })),
      adminActions: (d.adminActions ?? []).map(r => ({
        action: String(r.action ?? ''),
        summary: String(r.summary ?? ''),
        actorName: (r.actor_name as string) ?? null,
        createdAt: r.created_at as string,
      })),
    }
  },

  async list() {
    const supabase = requireClient()
    const { data, error } = await supabase
      .from(DEVOTEES_TABLE)
      .select(
        'id, user_id, full_name, mobile, nakshatram, gothram, created_at, is_blocked',
      )
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as DevoteeRow[]).map(mapRow)
  },

  async create(input: CreateDevoteeInput) {
    await invokeAdmin({ action: 'create', ...input })
    audit('devotee.create', null, `Added devotee ${input.fullName.trim()}`)
  },

  async update(id: string, input: UpdateDevoteeInput) {
    await invokeAdmin({ action: 'update', id, ...input })
    audit('devotee.update', id, `Edited devotee ${input.fullName.trim()}`)
  },

  async remove(id: string) {
    await invokeAdmin({ action: 'delete', id })
    audit('devotee.delete', id, 'Deleted a devotee')
  },

  async setBlocked(id: string, blocked: boolean) {
    // Audited RPC → snapshots the row and makes the block/unblock revertible.
    const supabase = requireClient()
    const { error } = await supabase.rpc('admin_set_devotee_blocked', {
      devotee_id: id,
      blocked,
    })
    if (error) throw new Error(error.message)
  },
}
