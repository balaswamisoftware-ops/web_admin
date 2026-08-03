import type {
  Devotee,
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
  full_name: string
  mobile: string
  nakshatram: string
  gothram: string
  created_at: string
  is_blocked: boolean | null
}

function mapRow(row: DevoteeRow): Devotee {
  return {
    id: row.id,
    fullName: row.full_name,
    mobile: row.mobile,
    nakshatram: row.nakshatram,
    gothram: row.gothram,
    createdAt: row.created_at,
    isBlocked: Boolean(row.is_blocked),
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
  async list() {
    const supabase = requireClient()
    const { data, error } = await supabase
      .from(DEVOTEES_TABLE)
      .select('id, full_name, mobile, nakshatram, gothram, created_at, is_blocked')
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
