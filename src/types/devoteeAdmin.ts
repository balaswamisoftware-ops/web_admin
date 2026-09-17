import type { ChantLevel } from './mission'

/**
 * Devotee Admins — group leaders appointed from the devotees. They register
 * devotees under themselves in the mobile app and record chants for them.
 * Mirrors `devotee-admins.sql`.
 */

export interface DevoteeAdminSummary {
  admins: number
  active: number
  /** Devotees currently in any group. */
  members: number
  /** Sum of every group member's current chant count. */
  groupChants: number
  /** Chants entered by Devotee Admins in the last 7 days (net of undos). */
  entered7d: number
}

/** One Devotee Admin as listed on the overview. */
export interface DevoteeAdminRow {
  userId: string
  devoteeId: string | null
  fullName: string
  mobile: string
  isActive: boolean
  appointedAt: string
  appointedByName: string | null
  suspendedAt: string | null
  members: number
  groupChants: number
  entered7d: number
  enteredTotal: number
  lastEntryAt: string | null
}

export interface DevoteeAdminsOverview {
  summary: DevoteeAdminSummary
  admins: DevoteeAdminRow[]
}

export interface GroupMember {
  devoteeId: string
  userId: string
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  isBlocked: boolean
  /** Current total, however it was reached. */
  count: number
  /** How much of it this group's admin entered (net of undos). */
  enteredByAdmin: number
  managedSince: string | null
  createdAt: string
  lastEntryAt: string | null
}

/** A chant entry a Devotee Admin made for a member. */
export interface GroupEntry {
  logId: string
  memberName: string | null
  memberMobile: string | null
  amount: number
  createdAt: string
  /** Set when the admin undid this entry. */
  undoneAt: string | null
}

export interface DevoteeAdminDetail {
  admin: {
    userId: string
    devoteeId: string | null
    fullName: string
    mobile: string
    nakshatram: string
    gothram: string
    isActive: boolean
    appointedAt: string
    appointedByName: string | null
    suspendedAt: string | null
    ownCount: number
  }
  levels: ChantLevel[]
  members: GroupMember[]
  entries: GroupEntry[]
  /** Chants this admin entered per day, oldest first, 30 days. */
  daily: { day: string; chants: number }[]
}

/** A devotee found by the Appoint / Add-to-group search. */
export interface DevoteeCandidate {
  devoteeId: string
  userId: string | null
  fullName: string
  mobile: string
  isBlocked: boolean
  isDevoteeAdmin: boolean
  managerUserId: string | null
  managerName: string | null
}
