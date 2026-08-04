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
}

export interface ChantEntry {
  userId: string
  fullName: string
  mobile: string
  count: number
  updatedAt: string
}

export interface MissionSettings {
  target: number
  donationAmount: number
  phonepeNumber: string
  upiId: string
  qrUrl: string
  announcement: string
  missionActive: boolean
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
}
