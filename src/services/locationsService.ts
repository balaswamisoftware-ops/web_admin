import { getSupabaseClient } from '../lib/supabaseClient'

export interface UserLocation {
  fullName: string
  lat: number
  lng: number
  country: string | null
  state: string | null
  district: string | null
  updatedAt: string
}

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length > 0 ? s : null
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
        country: str(r.country),
        state: str(r.state),
        district: str(r.district),
        updatedAt: r.updated_at as string,
      }))
      .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  },
}
