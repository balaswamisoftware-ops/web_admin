export interface DashboardStats {
  totalDevotees: number
  totalChants: number
  target: number
  remaining: number
  totalDonations: number
  pendingVerifications: number
  verifiedDonations: number
}

export type DonationStatus = 'pending' | 'verified' | 'rejected' | 'completed'

export interface Donation {
  id: string
  userId: string
  fullName: string
  mobile: string
  amount: number
  upiTxnId: string | null
  screenshotUrl: string | null
  status: DonationStatus
  adminRemarks: string | null
  createdAt: string
  verifiedAt: string | null
  /** This UPI reference appears on more than one donation — likely a re-use. */
  dupTxn: boolean
  /** Amount differs from the seva amount configured in settings. */
  amountMismatch: boolean
  /** The seva amount settings currently expects. */
  expectedAmount: number
}

/** Counts per status across ALL donations, for the filter chips. */
export interface DonationCounts {
  all: number
  pending: number
  verified: number
  completed: number
  rejected: number
  flagged: number
}

/** One UPI reference used by more than one donation. */
export interface DuplicateTxn {
  txnId: string
  uses: number
  ids: string[]
  devotees: string[]
  statuses: string[]
}

export interface ChantEntry {
  userId: string
  fullName: string
  mobile: string
  count: number
  updatedAt: string
  /** Position across the whole mission (1 = highest count). */
  rank: number
}

/** A point on a daily series returned by `admin_analytics`. */
export interface DailyPoint {
  date: string
  value: number
}

export interface Analytics {
  days: number
  totalChants: number
  remaining: number
  dailyChants: DailyPoint[]
  dailyRegistrations: DailyPoint[]
  /** Registered -> chanted -> hit personal goal -> donation verified. */
  funnel: {
    registered: number
    chanted: number
    completed: number
    donated: number
  }
  activity: {
    today: number
    week: number
    month: number
    activeDevotees7d: number
    activeDevotees30d: number
    dormant30d: number
  }
  /** Straight-line projection from the last 14 days of chanting. */
  projection: {
    avgPerDay: number
    daysToTarget: number | null
    targetDate: string | null
  }
}

export interface LeaderboardEntry {
  rank: number
  userId: string
  devoteeId: string | null
  fullName: string
  mobile: string
  nakshatram: string
  count: number
  malas: number
  pct: number
  completed: boolean
  donationStatus: DonationStatus | null
  updatedAt: string
}

export interface MilestoneTier {
  label: string
  threshold: number
  count: number
}

export interface Completer {
  devoteeId: string
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  count: number
  updatedAt: string
  donationStatus: DonationStatus | null
}

/** One rung of the ladder, with how many devotees are standing on it. */
export interface LevelStanding extends ChantLevel {
  count: number
}

export interface Milestones {
  target: number
  /** The hard ceiling — the end of the last chant level. */
  ceiling: number
  tiers: MilestoneTier[]
  /** Devotees per chant level. Empty on a server that predates the ladder. */
  levels: LevelStanding[]
  completers: Completer[]
}

/** Who last saved the settings singleton, and when. */
export interface SettingsMeta {
  updatedAt: string | null
  lastChange: {
    actorName: string | null
    actorEmail: string | null
    at: string
    summary: string | null
  } | null
}

/**
 * One rung of the chant ladder. The range is half-open `[from, to)`; the LAST
 * level's `to` is inclusive and is the hard ceiling — no chant beyond it is ever
 * accepted. Levels must be contiguous (`levels[i].to === levels[i+1].from`) and
 * the first must start at 0; `validate_chant_levels()` enforces both server-side.
 */
export interface ChantLevel {
  /** 1-based position on the ladder. */
  n: number
  /** The name devotees see, e.g. "Sadhaka". */
  name: string
  /** First chant count in this level. */
  from: number
  /** First chant count of the NEXT level (the ceiling on the last one). */
  to: number
}

export interface MissionSettings {
  target: number
  /**
   * The collective goal all devotees chant towards (11 Crore at launch). Purely
   * a progress marker — it never blocks chanting, so raising it once it has
   * been crossed simply extends the mission.
   */
  communityTarget: number
  donationAmount: number
  phonepeNumber: string
  upiId: string
  qrUrl: string
  announcement: string
  missionActive: boolean
  /**
   * Per-submission chant cap. When disabled the devotee may enter any amount
   * they wish; when enabled they can submit at most `chantLimitMax` at a time.
   */
  chantLimitEnabled: boolean
  chantLimitMax: number
  /** Latest published app version — below this, devotees see an optional update prompt. */
  latestVersion: string
  /** Minimum supported app version — below this, the app forces an update. */
  minVersion: string
  /** Store URL the update button opens (Play Store / App Store). */
  updateUrl: string
  /**
   * Master switch for advertisements. While false the app shows no ads at all.
   * Keep it off until the app is published and real ad-unit IDs are set.
   */
  adsEnabled: boolean
  /** AdMob ad-unit IDs used by the app at runtime (empty = no ads shown). */
  admobAndroidBanner: string
  admobAndroidInterstitial: string
  admobIosBanner: string
  admobIosInterstitial: string
  /** Admin-managed devotional audio clip played in the mobile app. */
  audioEnabled: boolean
  audioUrl: string
  audioTitle: string
  /**
   * The chant-level ladder, ascending. The end of the last level is the hard
   * ceiling every devotee chants towards.
   */
  chantLevels: ChantLevel[]
}
