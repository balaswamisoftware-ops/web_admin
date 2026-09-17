/** The named audience groups. Mirrors `notification_user_ids()`. */
export type SegmentKey =
  | 'all'
  | 'not_donated'
  | 'inactive_7d'
  | 'inactive_30d'
  | 'never_chanted'
  | 'in_progress'
  | 'completed'

/**
 * What a broadcast targets: a named group, or one devotee as `user:<user_id>`
 * (resolved by the same SQL function, so the same reachability rules apply).
 */
export type NotificationSegment = SegmentKey | `user:${string}`

/** Result of looking a devotee up by mobile for a one-person broadcast. */
export interface NotificationRecipient {
  /** `ok` = can be notified; anything else says why not. */
  status: 'ok' | 'invalid' | 'not_found' | 'blocked' | 'no_device'
  userId?: string
  fullName?: string
  mobile?: string
  devices?: number
}

export type NotificationStatus = 'queued' | 'sending' | 'sent' | 'failed'

/** One broadcast, with its delivery outcome. */
export interface NotificationCampaign {
  id: string
  title: string
  body: string
  segment: NotificationSegment
  link: string | null
  status: NotificationStatus
  audienceSize: number
  sentCount: number
  failedCount: number
  error: string | null
  createdByName: string | null
  createdAt: string
  completedAt: string | null
  /** Set on a one-person broadcast: who it went to. */
  targetName: string | null
  targetMobile: string | null
}

/** How many devotees each segment currently reaches. */
export type SegmentReach = Record<SegmentKey, number> & {
  registeredDevices: number
  registeredDevotees: number
}

export interface SendResult {
  sent: number
  failed: number
  audience: number
  pruned?: number
}
