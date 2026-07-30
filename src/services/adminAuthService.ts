import type { AdminUser, AdminCredentials } from '../types/admin'
import { isSupabaseConfigured } from '../config/env'
import { getSupabaseClient } from '../lib/supabaseClient'

/**
 * Admin authentication contract. The UI depends only on this interface so the
 * Supabase and mock backends stay interchangeable.
 */
export interface AdminAuthService {
  getCurrentAdmin(): Promise<AdminUser | null>
  signIn(credentials: AdminCredentials): Promise<AdminUser>
  signOut(): Promise<void>
}

const ADMINS_TABLE = 'admins'

/** Reads the admins row for a signed-in auth user; null if they aren't an admin. */
async function loadAdminProfile(userId: string, email: string): Promise<AdminUser | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null
  const { data, error } = await supabase
    .from(ADMINS_TABLE)
    .select('user_id, full_name, is_super_admin')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: userId,
    email,
    fullName: (data.full_name as string) ?? email,
    isSuperAdmin: Boolean(data.is_super_admin),
  }
}

const supabaseAdminAuth: AdminAuthService = {
  async getCurrentAdmin() {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return null
    return loadAdminProfile(session.user.id, session.user.email ?? '')
  },

  async signIn({ email, password }) {
    const supabase = getSupabaseClient()
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      throw new Error('Invalid email or password.')
    }
    const admin = await loadAdminProfile(data.user.id, data.user.email ?? email)
    if (!admin) {
      await supabase.auth.signOut()
      throw new Error('This account does not have admin access.')
    }
    return admin
  },

  async signOut() {
    const supabase = getSupabaseClient()
    await supabase?.auth.signOut()
  },
}

// Dev-only mock admin (used when Supabase is not configured).
const MOCK_ADMIN: AdminUser = {
  id: 'mock-admin',
  email: 'admin@srividyapitam.app',
  fullName: 'Super Admin',
  isSuperAdmin: true,
}
const MOCK_SESSION_KEY = 'admin/session'

const mockAdminAuth: AdminAuthService = {
  async getCurrentAdmin() {
    return localStorage.getItem(MOCK_SESSION_KEY) ? MOCK_ADMIN : null
  },
  async signIn({ email, password }) {
    if (email === MOCK_ADMIN.email && password === 'admin123') {
      localStorage.setItem(MOCK_SESSION_KEY, '1')
      return MOCK_ADMIN
    }
    throw new Error('Invalid email or password. (dev: admin@srividyapitam.app / admin123)')
  },
  async signOut() {
    localStorage.removeItem(MOCK_SESSION_KEY)
  },
}

export const adminAuthService: AdminAuthService = isSupabaseConfigured
  ? supabaseAdminAuth
  : mockAdminAuth
