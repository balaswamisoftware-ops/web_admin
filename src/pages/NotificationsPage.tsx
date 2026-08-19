import { useMemo, useState } from 'react'
import {
  Bell,
  Send,
  RefreshCw,
  Users,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Link2,
} from 'lucide-react'
import type { NotificationSegment } from '../types/notification'
import { useNotifications } from '../hooks/useNotifications'
import { SEGMENTS } from '../services/notificationsService'
import { Badge, Button, Pagination, useToast } from '../components/ui'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'
import { formatDateTime, formatNumber } from '../lib/format'

const TITLE_MAX = 120
const BODY_MAX = 500

const inputCls =
  'h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-stone-500'

function StatusPill({
  status,
  sent,
  failed,
}: {
  status: string
  sent: number
  failed: number
}) {
  if (status === 'sent' && failed === 0)
    return (
      <Badge tone="success">
        <CheckCircle2 size={11} /> Delivered to {formatNumber(sent)}
      </Badge>
    )
  if (status === 'sent')
    return (
      <Badge tone="warning">
        <AlertCircle size={11} /> {formatNumber(sent)} sent · {formatNumber(failed)} failed
      </Badge>
    )
  if (status === 'failed')
    return (
      <Badge tone="danger">
        <XCircle size={11} /> Failed
      </Badge>
    )
  return (
    <Badge tone="neutral">
      <Clock size={11} /> {status}
    </Badge>
  )
}

export function NotificationsPage() {
  const {
    reach,
    history,
    total,
    page,
    setPage,
    pageCount,
    from,
    to,
    loading,
    sending,
    error,
    send,
    refresh,
  } = useNotifications()

  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [segment, setSegment] = useState<NotificationSegment>('all')
  const [confirming, setConfirming] = useState(false)

  const audience = reach?.[segment] ?? 0
  const canSend =
    title.trim().length > 0 && body.trim().length > 0 && audience > 0 && !sending

  // A broadcast cannot be recalled, so nothing sends without a confirm step.
  const doSend = async () => {
    setConfirming(false)
    try {
      const result = await send({ title, body, segment, link: link || undefined })
      if (result.failed > 0) {
        toast.info(
          `Sent to ${result.sent} device(s); ${result.failed} could not be reached.`,
        )
      } else {
        toast.success(`Broadcast delivered to ${result.sent} device(s).`)
      }
      setTitle('')
      setBody('')
      setLink('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the broadcast.')
    }
  }

  const segmentLabel = useMemo(
    () => SEGMENTS.find(s => s.key === segment)?.label ?? segment,
    [segment],
  )

  // Nothing can be delivered before a single device has registered a token.
  const noDevices = reach != null && reach.registeredDevices === 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Bell size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">
              Broadcasts
            </div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : reach
                  ? `${formatNumber(reach.registeredDevotees)} devotees reachable on ${formatNumber(reach.registeredDevices)} device(s)`
                  : 'Push notifications to devotees'}
            </div>
          </div>
        </div>
        <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {noDevices && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <Smartphone size={18} className="mt-0.5 shrink-0" />
          <span>
            No device has registered for notifications yet. Devotees register
            automatically on the first launch of an app build that ships push
            support — until then nothing can be delivered.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Compose */}
        <section className="rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm lg:col-span-2 dark:border-white/10 dark:bg-neutral-900/70">
          <h2 className="mb-4 text-[15px] font-semibold text-stone-900 dark:text-white">
            Compose a broadcast
          </h2>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
              Title
            </span>
            <input
              value={title}
              maxLength={TITLE_MAX}
              onChange={e => setTitle(e.target.value)}
              placeholder="2,000 chants to go 🙏"
              className={inputCls}
            />
            <span className="text-xs text-stone-400">
              {title.length}/{TITLE_MAX}
            </span>
          </label>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
              Message
            </span>
            <textarea
              value={body}
              maxLength={BODY_MAX}
              rows={3}
              onChange={e => setBody(e.target.value)}
              placeholder="Complete your mala today and bring the community closer to 11 crore."
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
            <span className="text-xs text-stone-400">
              {body.length}/{BODY_MAX}
            </span>
          </label>

          <label className="mb-5 flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
              <Link2 size={14} /> Deep link (optional)
            </span>
            <input
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
            <span className="text-xs text-stone-400">
              Opened when the devotee taps the notification.
            </span>
          </label>

          {/* Live preview of the notification as it lands on a phone. */}
          <div className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
              Preview
            </p>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                  ॐ
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-stone-900 dark:text-white">
                    {title.trim() || 'Notification title'}
                  </div>
                  <div className="text-[13px] leading-snug text-stone-600 dark:text-stone-300">
                    {body.trim() || 'Your message appears here.'}
                  </div>
                  <div className="mt-0.5 text-[11px] text-stone-400">
                    Sri Vidya Peetam · now
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-stone-500">
              Sending to <strong className="text-stone-800 dark:text-stone-100">{segmentLabel}</strong>{' '}
              — {formatNumber(audience)} devotee(s)
            </p>
            <Button
              leftIcon={Send}
              isDisabled={!canSend}
              isPending={sending}
              onPress={() => setConfirming(true)}
            >
              Send broadcast
            </Button>
          </div>
        </section>

        {/* Segments */}
        <section className="rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
          <h2 className="mb-1 flex items-center gap-2 text-[15px] font-semibold text-stone-900 dark:text-white">
            <Users size={17} /> Audience
          </h2>
          <p className="mb-4 text-xs text-stone-500">
            Counts include only devotees with a registered device.
          </p>
          <div className="space-y-1.5">
            {SEGMENTS.map(s => {
              const count = reach?.[s.key] ?? 0
              const active = segment === s.key
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSegment(s.key)}
                  disabled={count === 0 && s.key !== 'all'}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40 ${
                    active
                      ? 'border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/40'
                      : 'border-stone-200 hover:bg-stone-50 dark:border-white/10 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${
                        active
                          ? 'text-brand-800 dark:text-brand-200'
                          : 'text-stone-800 dark:text-stone-100'
                      }`}
                    >
                      {s.label}
                    </span>
                    <span className="text-sm font-semibold text-stone-500">
                      {loading ? '—' : formatNumber(count)}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400">{s.description}</div>
                </button>
              )
            })}
          </div>
        </section>
      </div>

      {/* History */}
      <section className="mt-6">
        <h2 className="mb-3 text-[15px] font-semibold text-stone-900 dark:text-white">
          Sent broadcasts
        </h2>
        {loading ? (
          <p className="py-10 text-center text-sm text-stone-400">Loading…</p>
        ) : history.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 py-12 text-center text-sm text-stone-400 dark:border-neutral-700">
            No broadcast has been sent yet.
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {history.map(n => (
                <li
                  key={n.id}
                  className="rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <StatusPill
                          status={n.status}
                          sent={n.sentCount}
                          failed={n.failedCount}
                        />
                        <Badge tone="brand">
                          {SEGMENTS.find(s => s.key === n.segment)?.label ?? n.segment}
                        </Badge>
                      </div>
                      <p className="font-semibold text-stone-900 dark:text-white">
                        {n.title}
                      </p>
                      <p className="text-sm text-stone-600 dark:text-stone-300">{n.body}</p>
                      <p className="mt-1 text-xs text-stone-400">
                        {n.createdByName ?? 'Admin'} · {formatDateTime(n.createdAt)} ·
                        audience {formatNumber(n.audienceSize)}
                      </p>
                      {n.error && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {n.error}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCount}
              from={from}
              to={to}
              total={total}
              onPage={setPage}
              label="broadcasts"
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        title="Send this broadcast?"
        message={`This immediately notifies ${formatNumber(audience)} devotee(s) in "${segmentLabel}". A push cannot be recalled once sent.`}
        confirmLabel="Send now"
        loading={sending}
        onConfirm={doSend}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
