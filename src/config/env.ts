/**
 * Backend configuration for the admin portal.
 *
 * Set these in an `.env` file at the project root (Vite auto-loads it):
 *   VITE_SUPABASE_URL=...
 *   VITE_SUPABASE_ANON_KEY=...
 *
 * While empty, the portal uses a seeded local mock (localStorage) so the
 * devotees screen works with zero backend setup. Fill them in and the
 * Supabase-backed service takes over — no other code changes needed.
 */

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Table that stores devotee profiles (shared with the mobile app). */
export const DEVOTEES_TABLE = 'devotees';

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
