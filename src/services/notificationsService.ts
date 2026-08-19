import { getSupabaseClient } from '../lib/supabaseClient'
import { invokeWithRetry } from '../lib/invokeWithRetry'
import type {
  NotificationCampaign,
  NotificationSegment,
  NotificationStatus,
  SegmentReach,
  SendResult,
} from '../types/notification'

function client() {
  const c = getSupabaseClient()
  if (!c) throw new Error('Supabase is not configured.')
  return c
}

type Row = Record<string, unknown>

/**
 * Push broadcasts.
 *
 * Sending is deliberately two steps: `create()` writes the campaign row and its
 * audit entry, then `send()` hands the id to the `send-push` Edge Function,
 * which is the only place device tokens and the FCM service account exist. A
 * delivery therefore can never happen without an audit trail behind it, and a
 * retried send is rejected by the function (status is no longer 'queued')
 * rather than double-notifying every devotee.
 */
export const notificationsService = {
  /** How many devotees each segment currently reaches. */
  async reach(): Promise<SegmentReach> {
    const { data, error } = await client().rpc('admin_notification_reach')
    if (error) throw new Error(error.message)
    return data as SegmentReach
  },

  /** Audience preview for one segment. */
  async audience(segment: NotificationSegment): Promise<{ devotees: number; devices: number }> {
    const { data, error } = await client().rpc('admin_notification_audience', {
      seg: segment,
    })
    if (error) throw new Error(error.message)
    return data as { devotees: number; devices: number }
  },

  /** Create the campaign (audited). Returns its id. */
  async create(input: {
    title: string
    body: string
    segment: NotificationSegment
    link?: string
  }): Promise<string> {
    const { data, error } = await client().rpc('admin_create_notification', {
      p_title: input.title.trim(),
      p_body: input.body.trim(),
      p_segment: input.segment,
      p_link: input.link?.trim() || null,
    })
    if (error) throw new Error(error.message)
    return data as string
  },

  /** Deliver a queued campaign through the `send-push` Edge Function. */
  async send(notificationId: string): Promise<SendResult> {
    return invokeWithRetry<SendResult>(client(), 'send-push', { notificationId })
  },

  /** Compose + deliver in one call — what the page's Send button does. */
  async compose(input: {
    title: string
    body: string
    segment: NotificationSegment
    link?: string
  }): Promise<SendResult> {
    const id = await notificationsService.create(input)
    return notificationsService.send(id)
  },

  /** Broadcast history, newest first. */
  async history(
    page = 1,
    pageSize = 10,
  ): Promise<{ rows: NotificationCampaign[]; total: number }> {
    const { data, error } = await client().rpc('admin_list_notifications', {
      lim: pageSize,
      off: (page - 1) * pageSize,
    })
    if (error) throw new Error(error.message)
    const rows = (data as Row[]) ?? []
    return {
      rows: rows.map(r => ({
        id: r.id as string,
        title: String(r.title ?? ''),
        body: String(r.body ?? ''),
        segment: (r.segment as NotificationSegment) ?? 'all',
        link: (r.link as string) ?? null,
        status: (r.status as NotificationStatus) ?? 'queued',
        audienceSize: Number(r.audience_size ?? 0),
        sentCount: Number(r.sent_count ?? 0),
        failedCount: Number(r.failed_count ?? 0),
        error: (r.error as string) ?? null,
        createdByName: (r.created_by_name as string) ?? null,
        createdAt: r.created_at as string,
        completedAt: (r.completed_at as string) ?? null,
      })),
      total: rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0,
    }
  },
}

/** Segment labels + one-line descriptions, shown in the compose form. */
export const SEGMENTS: {
  key: NotificationSegment
  label: string
  description: string
}[] = [
  { key: 'all', label: 'Everyone', description: 'Every devotee with the app installed' },
  {
    key: 'not_donated',
    label: 'Not yet donated',
    description: 'No verified seva donation on record',
  },
  {
    key: 'inactive_7d',
    label: 'Inactive 7 days',
    description: "Hasn't chanted in the last week",
  },
  {
    key: 'inactive_30d',
    label: 'Inactive 30 days',
    description: "Hasn't chanted in the last month",
  },
  {
    key: 'never_chanted',
    label: 'Never chanted',
    description: 'Registered but has not started',
  },
  {
    key: 'in_progress',
    label: 'In progress',
    description: 'Chanting, still below the personal goal',
  },
  {
    key: 'completed',
    label: 'Goal reached',
    description: 'Completed their personal chant goal',
  },
]
