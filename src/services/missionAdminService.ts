import { getSupabaseClient } from '../lib/supabaseClient'
import type {
  ChantEntry,
  DashboardStats,
  Donation,
  DonationStatus,
  MissionSettings,
} from '../types/mission'

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

const EMPTY_STATS: DashboardStats = {
  totalDevotees: 0,
  totalChants: 0,
  target: 100000,
  remaining: 100000,
  totalDonations: 0,
  pendingVerifications: 0,
  verifiedDonations: 0,
}

/** Dashboard + chant + donation + settings operations for the admin portal. */
export const missionAdminService = {
  async dashboardStats(): Promise<DashboardStats> {
    const { data, error } = await client().rpc('admin_dashboard_stats')
    if (error) throw new Error(error.message)
    return { ...EMPTY_STATS, ...(data as Partial<DashboardStats>) }
  },

  // ---- Donations ----
  async listDonations(): Promise<Donation[]> {
    const { data, error } = await client().rpc('admin_list_donations')
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      userId: r.user_id as string,
      fullName: (r.full_name as string) ?? '—',
      mobile: (r.mobile as string) ?? '',
      amount: r.amount as number,
      upiTxnId: (r.upi_txn_id as string) ?? null,
      screenshotUrl: (r.screenshot_url as string) ?? null,
      status: r.status as DonationStatus,
      adminRemarks: (r.admin_remarks as string) ?? null,
      createdAt: r.created_at as string,
      verifiedAt: (r.verified_at as string) ?? null,
    }))
  },

  async updateDonation(id: string, status: DonationStatus, remarks: string) {
    const { error } = await client().rpc('admin_update_donation', {
      donation_id: id,
      new_status: status,
      remarks,
    })
    if (error) throw new Error(error.message)
  },

  /** Signed URL to view a private payment screenshot. */
  async screenshotUrl(path: string): Promise<string | null> {
    // Already a full URL (e.g. seeded/manual)? use as-is.
    if (/^https?:\/\//.test(path)) return path
    const { data, error } = await client()
      .storage.from('payment-screenshots')
      .createSignedUrl(path, 3600)
    if (error) return null
    return data.signedUrl
  },

  // ---- Chants ----
  async listChants(): Promise<ChantEntry[]> {
    const { data, error } = await client().rpc('admin_list_chants')
    if (error) throw new Error(error.message)
    return (data as Record<string, unknown>[]).map(r => ({
      userId: r.user_id as string,
      fullName: (r.full_name as string) ?? '—',
      mobile: (r.mobile as string) ?? '',
      count: r.count as number,
      updatedAt: r.updated_at as string,
    }))
  },

  async setChantCount(userId: string, count: number) {
    const { error } = await client().rpc('admin_set_chant', {
      target_user: userId,
      new_count: count,
    })
    if (error) throw new Error(error.message)
  },

  // ---- Settings ----
  async getSettings(): Promise<MissionSettings> {
    const { data, error } = await client()
      .from('settings')
      .select(
        'target, donation_amount, phonepe_number, upi_id, qr_url, announcement, mission_active, latest_version, min_version, update_url, ads_enabled, admob_android_banner, admob_android_interstitial, admob_ios_banner, admob_ios_interstitial',
      )
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)
    return {
      target: data.target ?? 100000,
      donationAmount: data.donation_amount ?? 216,
      phonepeNumber: data.phonepe_number ?? '',
      upiId: data.upi_id ?? '',
      qrUrl: data.qr_url ?? '',
      announcement: data.announcement ?? '',
      missionActive: data.mission_active ?? true,
      latestVersion: data.latest_version ?? '1.0.0',
      minVersion: data.min_version ?? '1.0.0',
      updateUrl: data.update_url ?? '',
      adsEnabled: data.ads_enabled ?? false,
      admobAndroidBanner: data.admob_android_banner ?? '',
      admobAndroidInterstitial: data.admob_android_interstitial ?? '',
      admobIosBanner: data.admob_ios_banner ?? '',
      admobIosInterstitial: data.admob_ios_interstitial ?? '',
    }
  },

  async updateSettings(patch: Partial<MissionSettings>) {
    const row: Record<string, unknown> = {}
    if (patch.target !== undefined) row.target = patch.target
    if (patch.donationAmount !== undefined) row.donation_amount = patch.donationAmount
    if (patch.phonepeNumber !== undefined) row.phonepe_number = patch.phonepeNumber
    if (patch.upiId !== undefined) row.upi_id = patch.upiId
    if (patch.qrUrl !== undefined) row.qr_url = patch.qrUrl
    if (patch.announcement !== undefined) row.announcement = patch.announcement
    if (patch.missionActive !== undefined) row.mission_active = patch.missionActive
    if (patch.latestVersion !== undefined) row.latest_version = patch.latestVersion.trim()
    if (patch.minVersion !== undefined) row.min_version = patch.minVersion.trim()
    if (patch.updateUrl !== undefined) row.update_url = patch.updateUrl.trim()
    if (patch.adsEnabled !== undefined) row.ads_enabled = patch.adsEnabled
    if (patch.admobAndroidBanner !== undefined)
      row.admob_android_banner = patch.admobAndroidBanner.trim()
    if (patch.admobAndroidInterstitial !== undefined)
      row.admob_android_interstitial = patch.admobAndroidInterstitial.trim()
    if (patch.admobIosBanner !== undefined)
      row.admob_ios_banner = patch.admobIosBanner.trim()
    if (patch.admobIosInterstitial !== undefined)
      row.admob_ios_interstitial = patch.admobIosInterstitial.trim()
    // Go through the audited RPC so the change is snapshotted + revertible.
    const { error } = await client().rpc('admin_update_settings', { patch: row })
    if (error) throw new Error(error.message)
  },
}
