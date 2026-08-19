import { useCallback, useEffect, useState } from 'react'
import { notificationsService } from '../services/notificationsService'
import type {
  NotificationCampaign,
  NotificationSegment,
  SegmentReach,
  SendResult,
} from '../types/notification'
import { isSupabaseConfigured } from '../config/env'

/** Compose + send broadcasts, and the delivery history below the form. */
export function useNotifications(pageSize = 10) {
  const [reach, setReach] = useState<SegmentReach | null>(null)
  const [history, setHistory] = useState<NotificationCampaign[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [reachData, historyData] = await Promise.all([
        notificationsService.reach(),
        notificationsService.history(page, pageSize),
      ])
      setReach(reachData)
      setHistory(historyData.rows)
      setTotal(historyData.total)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load broadcasts.')
    } finally {
      setLoading(false)
    }
  }, [page, pageSize])

  useEffect(() => {
    void load()
  }, [load])

  const send = useCallback(
    async (input: {
      title: string
      body: string
      segment: NotificationSegment
      link?: string
    }): Promise<SendResult> => {
      setSending(true)
      try {
        const result = await notificationsService.compose(input)
        // Jump back to the first page so the broadcast just sent is on screen.
        setPage(1)
        await load()
        return result
      } finally {
        setSending(false)
      }
    },
    [load],
  )

  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return {
    reach,
    history,
    total,
    page,
    setPage,
    pageCount,
    pageSize,
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
    loading,
    sending,
    error,
    send,
    refresh: load,
  }
}
