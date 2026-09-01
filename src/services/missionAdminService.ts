import { getSupabaseClient } from '../lib/supabaseClient'
import { COMMUNITY_CHANT_TARGET } from '../constants/mission'
import { parseLevels, validateLevels } from '../lib/levels'
import type {
  Analytics,
  ChantEntry,
  Completer,
  DashboardStats,
  Donation,
  DonationCounts,
  DonationStatus,
  DuplicateTxn,
  LeaderboardEntry,
  Milestones,
  MissionSettings,
  SettingsMeta,
} from '../types/mission'

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

type Row = Record<string, unknown>

const str = (v: unknown, fallback = '') => (v == null ? fallback : String(v))
const int = (v: unknown, fallback = 0) => (v == null ? fallback : Number(v))

const EMPTY_STATS: DashboardStats = {
  totalDevotees: 0,
  totalChants: 0,
  target: 100000,
  remaining: 100000,
  totalDonations: 0,
  pendingVerifications: 0,
  verifiedDonations: 0,
}

/** Shared shape of a server-side page request. */
export interface PageQuery {
  query?: string
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  from?: string | null
  to?: string | null
}

/** `total_count` rides along on every row; pull it off the first one. */
function paged<T>(rows: Row[], map: (r: Row) => T) {
  return {
    rows: rows.map(map),
    total: rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0,
  }
}

const offsetOf = (q: PageQuery) => ((q.page ?? 1) - 1) * (q.pageSize ?? 15)

function mapDonation(r: Row): Donation {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    fullName: str(r.full_name, '—'),
    mobile: str(r.mobile),
    amount: int(r.amount),
    upiTxnId: (r.upi_txn_id as string) ?? null,
    screenshotUrl: (r.screenshot_url as string) ?? null,
    status: r.status as DonationStatus,
    adminRemarks: (r.admin_remarks as string) ?? null,
    createdAt: r.created_at as string,
    verifiedAt: (r.verified_at as string) ?? null,
    dupTxn: Boolean(r.dup_txn),
    amountMismatch: Boolean(r.amount_mismatch),
    expectedAmount: int(r.expected_amount, 216),
  }
}

function mapChant(r: Row): ChantEntry {
  return {
    userId: r.user_id as string,
    fullName: str(r.full_name, '—'),
    mobile: str(r.mobile),
    count: int(r.count),
    updatedAt: r.updated_at as string,
    rank: int(r.rank),
  }
}

/** Dashboard + chant + donation + settings operations for the admin portal. */
export const missionAdminService = {
  async dashboardStats(): Promise<DashboardStats> {
    const { data, error } = await client().rpc('admin_dashboard_stats')
    if (error) throw new Error(error.message)
    return { ...EMPTY_STATS, ...(data as Partial<DashboardStats>) }
  },

  /**
   * Velocity, funnel and the projected community-goal date. The target is the
   * admin-set one; the constant is only the fallback for a settings read that
   * failed, so the projection is never computed against a stale goal.
   */
  async analytics(days = 30, communityTarget = COMMUNITY_CHANT_TARGET): Promise<Analytics> {
    const { data, error } = await client().rpc('admin_analytics', {
      days,
      community_target: communityTarget,
    })
    if (error) throw new Error(error.message)
    return data as Analytics
  },

  /**
   * Just the community goal. Cheaper than `getSettings()` for the dashboard,
   * which needs the number but none of the rest of the settings row.
   */
  async communityTarget(): Promise<number> {
    const { data, error } = await client()
      .from('settings')
      .select('community_target')
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)
    return Number(data.community_target) || COMMUNITY_CHANT_TARGET
  },

  // ---- Donations ----
  /** One page of donations, filtered and sorted by the server. */
  async listDonationsPage(
    q: PageQuery & { status?: string } = {},
  ): Promise<{ rows: Donation[]; total: number }> {
    const { data, error } = await client().rpc('admin_list_donations_page', {
      q: q.query ?? '',
      status_f: q.status ?? 'all',
      from_date: q.from ?? null,
      to_date: q.to ?? null,
      sort_key: q.sortKey ?? 'queue',
      sort_dir: q.sortDir ?? 'asc',
      lim: q.pageSize ?? 15,
      off: offsetOf(q),
    })
    if (error) throw new Error(error.message)
    return paged(data as Row[], mapDonation)
  },

  /** Counts per status across all donations (drives the filter chips). */
  async donationCounts(): Promise<DonationCounts> {
    const { data, error } = await client().rpc('admin_donation_counts')
    if (error) throw new Error(error.message)
    return data as DonationCounts
  },

  /** Every UPI reference claimed by more than one donation. */
  async duplicateDonations(): Promise<DuplicateTxn[]> {
    const { data, error } = await client().rpc('admin_duplicate_donations')
    if (error) throw new Error(error.message)
    return (data as Row[]).map(r => ({
      txnId: str(r.txn_id),
      uses: int(r.uses),
      ids: (r.ids as string[]) ?? [],
      devotees: (r.devotees as string[]) ?? [],
      statuses: (r.statuses as string[]) ?? [],
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

  /** Apply one status to many donations. Each row stays individually revertible. */
  async bulkUpdateDonations(
    ids: string[],
    status: DonationStatus,
    remarks = '',
  ): Promise<number> {
    const { data, error } = await client().rpc('admin_bulk_update_donations', {
      donation_ids: ids,
      new_status: status,
      remarks,
    })
    if (error) throw new Error(error.message)
    return int(data)
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
  async listChantsPage(q: PageQuery = {}): Promise<{ rows: ChantEntry[]; total: number }> {
    const { data, error } = await client().rpc('admin_list_chants_page', {
      q: q.query ?? '',
      from_date: q.from ?? null,
      to_date: q.to ?? null,
      sort_key: q.sortKey ?? 'chants',
      sort_dir: q.sortDir ?? 'desc',
      lim: q.pageSize ?? 15,
      off: offsetOf(q),
    })
    if (error) throw new Error(error.message)
    return paged(data as Row[], mapChant)
  },

  async setChantCount(userId: string, count: number) {
    const { error } = await client().rpc('admin_set_chant', {
      target_user: userId,
      new_count: count,
    })
    if (error) throw new Error(error.message)
  },

  /** Devotee id behind an auth user id — lets the 360° drawer open anywhere. */
  async devoteeIdForUser(userId: string): Promise<string | null> {
    const { data, error } = await client().rpc('admin_devotee_id_for_user', {
      target_user: userId,
    })
    if (error) throw new Error(error.message)
    return (data as string) ?? null
  },

  // ---- Leaderboard & milestones ----
  async leaderboard(
    pageSize = 50,
    page = 1,
  ): Promise<{ rows: LeaderboardEntry[]; total: number }> {
    const { data, error } = await client().rpc('admin_leaderboard', {
      lim: pageSize,
      off: (page - 1) * pageSize,
    })
    if (error) throw new Error(error.message)
    return paged(data as Row[], r => ({
      rank: int(r.rank),
      userId: r.user_id as string,
      devoteeId: (r.devotee_id as string) ?? null,
      fullName: str(r.full_name, '—'),
      mobile: str(r.mobile),
      nakshatram: str(r.nakshatram),
      count: int(r.count),
      malas: int(r.malas),
      pct: Number(r.pct ?? 0),
      completed: Boolean(r.completed),
      donationStatus: (r.donation_status as DonationStatus) ?? null,
      updatedAt: r.updated_at as string,
    }))
  },

  async milestones(): Promise<Milestones> {
    const { data, error } = await client().rpc('admin_milestones')
    if (error) throw new Error(error.message)
    const d = data as {
      target: number
      ceiling?: number
      tiers: Milestones['tiers']
      levels?: Milestones['levels']
      completers: Row[]
    }
    return {
      target: d.target,
      ceiling: d.ceiling ?? 0,
      tiers: d.tiers ?? [],
      // Empty on a server that predates the ladder; the page hides the card then.
      levels: d.levels ?? [],
      completers: (d.completers ?? []).map(
        (r): Completer => ({
          devoteeId: r.devotee_id as string,
          fullName: str(r.full_name, '—'),
          mobile: str(r.mobile),
          nakshatram: str(r.nakshatram),
          gothram: str(r.gothram),
          count: int(r.count),
          updatedAt: r.updated_at as string,
          donationStatus: (r.donation_status as DonationStatus) ?? null,
        }),
      ),
    }
  },

  // ---- Settings ----
  async getSettings(): Promise<MissionSettings> {
    const { data, error } = await client()
      .from('settings')
      .select(
        'target, community_target, donation_amount, phonepe_number, upi_id, qr_url, announcement, mission_active, chant_limit_enabled, chant_limit_max, latest_version, min_version, update_url, ads_enabled, admob_android_banner, admob_android_interstitial, admob_ios_banner, admob_ios_interstitial, audio_enabled, audio_url, audio_title, chant_levels',
      )
      .eq('id', 1)
      .single()
    if (error) throw new Error(error.message)
    return {
      target: data.target ?? 100000,
      communityTarget: Number(data.community_target) || COMMUNITY_CHANT_TARGET,
      donationAmount: data.donation_amount ?? 216,
      phonepeNumber: data.phonepe_number ?? '',
      upiId: data.upi_id ?? '',
      qrUrl: data.qr_url ?? '',
      announcement: data.announcement ?? '',
      missionActive: data.mission_active ?? true,
      chantLimitEnabled: data.chant_limit_enabled ?? true,
      chantLimitMax: data.chant_limit_max ?? 5000,
      latestVersion: data.latest_version ?? '1.0.0',
      minVersion: data.min_version ?? '1.0.0',
      updateUrl: data.update_url ?? '',
      adsEnabled: data.ads_enabled ?? false,
      admobAndroidBanner: data.admob_android_banner ?? '',
      admobAndroidInterstitial: data.admob_android_interstitial ?? '',
      admobIosBanner: data.admob_ios_banner ?? '',
      admobIosInterstitial: data.admob_ios_interstitial ?? '',
      audioEnabled: data.audio_enabled ?? false,
      audioUrl: data.audio_url ?? '',
      audioTitle: data.audio_title ?? '',
      chantLevels: parseLevels(data.chant_levels),
    }
  },

  /** Who last saved settings, and when — shown under the Save button. */
  async settingsMeta(): Promise<SettingsMeta> {
    const { data, error } = await client().rpc('admin_settings_meta')
    if (error) throw new Error(error.message)
    return data as SettingsMeta
  },

  /** Upload an audio file to the public app-audio bucket; returns its URL. */
  async uploadAudio(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3'
    // Stable name so re-uploads replace the old clip (with a cache-buster).
    const path = `devotional.${ext}`
    const { error } = await client()
      .storage.from('app-audio')
      .upload(path, file, { upsert: true, contentType: file.type || 'audio/mpeg' })
    if (error) throw new Error(error.message)
    const { data } = client().storage.from('app-audio').getPublicUrl(path)
    return `${data.publicUrl}?v=${Date.now()}`
  },

  async updateSettings(patch: Partial<MissionSettings>) {
    const row: Record<string, unknown> = {}
    if (patch.target !== undefined) row.target = patch.target
    if (patch.communityTarget !== undefined)
      row.community_target = Math.max(1, Math.floor(patch.communityTarget))
    if (patch.donationAmount !== undefined) row.donation_amount = patch.donationAmount
    if (patch.phonepeNumber !== undefined) row.phonepe_number = patch.phonepeNumber
    if (patch.upiId !== undefined) row.upi_id = patch.upiId
    if (patch.qrUrl !== undefined) row.qr_url = patch.qrUrl
    if (patch.announcement !== undefined) row.announcement = patch.announcement
    if (patch.missionActive !== undefined) row.mission_active = patch.missionActive
    if (patch.chantLimitEnabled !== undefined)
      row.chant_limit_enabled = patch.chantLimitEnabled
    if (patch.chantLimitMax !== undefined)
      row.chant_limit_max = Math.max(1, Math.floor(patch.chantLimitMax))
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
    if (patch.audioEnabled !== undefined) row.audio_enabled = patch.audioEnabled
    if (patch.audioUrl !== undefined) row.audio_url = patch.audioUrl.trim()
    if (patch.audioTitle !== undefined) row.audio_title = patch.audioTitle.trim()
    if (patch.chantLevels !== undefined) {
      // Caught here as well as in Postgres, so a bad ladder never costs a round
      // trip — `validate_chant_levels()` remains the authority.
      const problem = validateLevels(patch.chantLevels)
      if (problem) throw new Error(problem)
      row.chant_levels = patch.chantLevels.map((l, i) => ({
        n: i + 1,
        name: l.name.trim(),
        from: Math.floor(l.from),
        to: Math.floor(l.to),
      }))
    }
    // Go through the audited RPC so the change is snapshotted + revertible.
    const { error } = await client().rpc('admin_update_settings', { patch: row })
    if (error) throw new Error(error.message)
  },
}
