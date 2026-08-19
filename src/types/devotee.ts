/** A devotee = a user who registered through the mobile app (or added here). */
export interface Devotee {
  id: string
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  createdAt: string
  isBlocked: boolean
  /** Auth user id — the key chant counts and donations hang off. */
  userId?: string | null
  /** Running chant total, joined server-side so the list needs one query. */
  chantCount?: number
  /** Best donation the devotee has, or null if they haven't donated. */
  donationStatus?: string | null
}

export interface CreateDevoteeInput {
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  password: string
}

export interface UpdateDevoteeInput {
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  /** Optional — only set to change the devotee's login password. */
  password?: string
}

/** Query for one server-side page of devotees. */
export interface DevoteeQuery {
  query?: string
  nakshatram?: string
  status?: 'all' | 'active' | 'blocked'
  /** ISO instants; `to` is exclusive. */
  from?: string | null
  to?: string | null
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export interface DevoteePage {
  rows: Devotee[]
  /** Size of the filtered set, not of the page. */
  total: number
}

/** One entry in a devotee's chant history. */
export interface ChantLogEntry {
  id: string
  /** Signed: negative when an admin reduced the count. */
  amount: number
  kind: 'add' | 'reset' | 'adjust'
  createdAt: string
}

export interface DevoteeDonation {
  id: string
  amount: number
  upiTxnId: string | null
  screenshotUrl: string | null
  status: string
  adminRemarks: string | null
  createdAt: string
  verifiedAt: string | null
}

export interface DevoteeAdminAction {
  action: string
  summary: string
  actorName: string | null
  createdAt: string
}

/** Everything the 360° drawer shows, from a single RPC call. */
export interface DevoteeDetail {
  devotee: Devotee & { userId: string | null }
  chantCount: number
  rank: number | null
  target: number
  firstChantAt: string | null
  lastChantAt: string | null
  activeDays: number
  logs: ChantLogEntry[]
  donations: DevoteeDonation[]
  adminActions: DevoteeAdminAction[]
}
