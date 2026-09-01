import { getSupabaseClient } from '../lib/supabaseClient'

export interface UserLocation {
  fullName: string
  lat: number
  lng: number
  updatedAt: string
}

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

/** Devotee locations for the admin globe (only those who shared a location). */
export const locationsService = {
  async list(): Promise<UserLocation[]> {
    const { data, error } = await client().rpc('admin_user_locations')
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown>[])
      .map(r => ({
        fullName: (r.full_name as string) ?? '—',
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        updatedAt: r.updated_at as string,
      }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  },
}
