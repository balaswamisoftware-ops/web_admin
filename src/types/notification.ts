/** Audience segments a broadcast can target. Mirrors `notification_user_ids()`. */
export type NotificationSegment =
  | 'all'
  | 'not_donated'
  | 'inactive_7d'
  | 'inactive_30d'
  | 'never_chanted'
  | 'in_progress'
  | 'completed'

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
}

/** How many devotees each segment currently reaches. */
export type SegmentReach = Record<NotificationSegment, number> & {
  registeredDevices: number
  registeredDevotees: number
}

export interface SendResult {
  sent: number
  failed: number
  audience: number
  pruned?: number
}
