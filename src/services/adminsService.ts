import type { AdminListItem, CreateAdminInput } from '../types/admin'
import { isSupabaseConfigured } from '../config/env'
import { getSupabaseClient } from '../lib/supabaseClient'
import { invokeWithRetry } from '../lib/invokeWithRetry'

/**
 * Manage admin accounts. Listing and role changes go straight to the DB (guarded
 * by super-admin RLS). Creating/deleting an admin also creates/deletes an auth
 * user, which needs the service role — that runs in the `admin-users` Edge
 * Function, never in the browser.
 */
export interface AdminsService {
  list(): Promise<AdminListItem[]>
  create(input: CreateAdminInput): Promise<void>
  remove(userId: string): Promise<void>
  setSuperAdmin(userId: string, value: boolean): Promise<void>
}

interface AdminRow {
  user_id: string
  email: string | null
  full_name: string
  is_super_admin: boolean
  created_at: string
}

function requireClient() {
  const client = getSupabaseClient()
  if (!client) throw new Error('Supabase is not configured.')
  return client
}

const supabaseAdmins: AdminsService = {
  async list() {
    const supabase = requireClient()
    const { data, error } = await supabase
      .from('admins')
      .select('user_id, email, full_name, is_super_admin, created_at')
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (data as AdminRow[]).map(r => ({
      userId: r.user_id,
      email: r.email ?? '',
      fullName: r.full_name,
      isSuperAdmin: r.is_super_admin,
      createdAt: r.created_at,
    }))
  },

  async create(input) {
    const supabase = requireClient()
    await invokeWithRetry(supabase, 'admin-users', {
      action: 'create',
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName.trim(),
      isSuperAdmin: input.isSuperAdmin,
    })
  },

  async remove(userId) {
    const supabase = requireClient()
    await invokeWithRetry(supabase, 'admin-users', { action: 'delete', userId })
  },

  async setSuperAdmin(userId, value) {
    const supabase = requireClient()
    const { error } = await supabase
      .from('admins')
      .update({ is_super_admin: value })
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  },
}

// ----- Dev mock (localStorage) --------------------------------------------
const KEY = 'admin/admins-list'

function seed(): AdminListItem[] {
  return [
    {
      userId: 'mock-admin',
      email: 'admin@srividyapitam.app',
      fullName: 'Super Admin',
      isSuperAdmin: true,
      createdAt: '2026-06-01T00:00:00.000Z',
    },
  ]
}
function read(): AdminListItem[] {
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    const s = seed()
    localStorage.setItem(KEY, JSON.stringify(s))
    return s
  }
  return JSON.parse(raw) as AdminListItem[]
}
function write(list: AdminListItem[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const mockAdmins: AdminsService = {
  async list() {
    await delay(300)
    return read()
  },
  async create(input) {
    await delay(400)
    const list = read()
    if (list.some(a => a.email.toLowerCase() === input.email.trim().toLowerCase())) {
      throw new Error('An account with this email already exists.')
    }
    list.push({
      userId: `mock-${Math.random().toString(36).slice(2, 10)}`,
      email: input.email.trim(),
      fullName: input.fullName.trim(),
      isSuperAdmin: input.isSuperAdmin,
      createdAt: new Date().toISOString(),
    })
    write(list)
  },
  async remove(userId) {
    await delay(300)
    write(read().filter(a => a.userId !== userId))
  },
  async setSuperAdmin(userId, value) {
    await delay(200)
    write(read().map(a => (a.userId === userId ? { ...a, isSuperAdmin: value } : a)))
  },
}

export const adminsService: AdminsService = isSupabaseConfigured
  ? supabaseAdmins
  : mockAdmins
