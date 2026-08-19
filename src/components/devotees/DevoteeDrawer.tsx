import { useEffect, useState } from 'react'
import {
  User,
  Flame,
  HandCoins,
  History,
  Ban,
  CircleCheck,
  Pencil,
  Trophy,
  CalendarDays,
  ImageOff,
  ExternalLink,
  ShieldAlert,
  Check,
  BadgeCheck,
} from 'lucide-react'
import type { Devotee } from '../../types/devotee'
import { useDevoteeDetail } from '../../hooks/useDevoteeDetail'
import { missionAdminService } from '../../services/missionAdminService'
import { Badge, Button, DonationBadge, Drawer, useToast } from '../ui'
import {
  formatDate,
  formatDateTime,
  formatInr,
  formatMobile,
  formatNumber,
  formatRelative,
} from '../../lib/format'

type Tab = 'overview' | 'chants' | 'donations'

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'chants', label: 'Chant history', icon: Flame },
  { key: 'donations', label: 'Donations', icon: HandCoins },
]

/* ── Small pieces ─────────────────────────────────────────────────────────── */

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-stone-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-400">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold leading-tight text-stone-900 dark:text-white">
        {value}
      </div>
      {hint && <div className="text-xs text-stone-400">{hint}</div>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="text-right font-medium text-stone-900 dark:text-white">
        {value}
      </span>
    </div>
  )
}

/** The kind of a chant-log row decides its wording and colour. */
function logStyle(amount: number, kind: string) {
  if (kind === 'reset') return { tone: 'danger' as const, label: 'Admin reset' }
  if (kind === 'adjust')
    return {
      tone: (amount >= 0 ? 'warning' : 'danger') as 'warning' | 'danger',
      label: amount >= 0 ? 'Admin added' : 'Admin reduced',
    }
  return { tone: 'brand' as const, label: 'Chanted' }
}

/** Signed screenshot URL, fetched only when a donation row is expanded. */
function ScreenshotLink({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(path))

  useEffect(() => {
    let active = true
    if (!path) {
      setLoading(false)
      return
    }
    missionAdminService
      .screenshotUrl(path)
      .then(u => active && setUrl(u))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [path])

  if (!path)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-stone-400">
        <ImageOff size={13} /> No screenshot
      </span>
    )
  if (loading) return <span className="text-xs text-stone-400">Loading…</span>
  if (!url) return <span className="text-xs text-stone-400">Screenshot unavailable</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
    >
      View screenshot <ExternalLink size={12} />
    </a>
  )
}

/* ── Drawer ───────────────────────────────────────────────────────────────── */

interface DevoteeDrawerProps {
  /** Devotee id to show; null closes the drawer. */
  devoteeId: string | null
  onClose: () => void
  /** Opens the edit dialog on the page behind the drawer. */
  onEdit?: (devotee: Devotee) => void
  /** Called after any change so the list behind refreshes. */
  onChanged?: () => void
}

/**
 * Everything about one devotee in a single panel: profile, progress, chant
 * history, donations and the admin actions taken on them — plus the actions
 * themselves, so verifying a payment or fixing a count no longer means walking
 * three separate pages and re-searching the same mobile number on each.
 */
export function DevoteeDrawer({
  devoteeId,
  onClose,
  onEdit,
  onChanged,
}: DevoteeDrawerProps) {
  const {
    detail,
    loading,
    error,
    busy,
    hasHistory,
    setChantCount,
    setBlocked,
    updateDonation,
  } = useDevoteeDetail(devoteeId)
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('overview')
  const [adjusting, setAdjusting] = useState(false)
  const [adjustValue, setAdjustValue] = useState('')

  // A fresh devotee starts on Overview with the adjust form closed.
  useEffect(() => {
    setTab('overview')
    setAdjusting(false)
  }, [devoteeId])

  const notifyChanged = () => onChanged?.()

  const saveCount = async () => {
    const n = parseInt(adjustValue, 10)
    if (!Number.isFinite(n) || n < 0) {
      toast.error('Enter a valid count (0 or more).')
      return
    }
    try {
      await setChantCount(n)
      toast.success(`Chant count set to ${formatNumber(n)}.`)
      setAdjusting(false)
      notifyChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the count.')
    }
  }

  const toggleBlock = async () => {
    if (!detail) return
    const next = !detail.devotee.isBlocked
    try {
      await setBlocked(next)
      toast.success(`${next ? 'Blocked' : 'Unblocked'} ${detail.devotee.fullName}.`)
      notifyChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed.')
    }
  }

  const decide = async (
    id: string,
    status: 'verified' | 'rejected' | 'completed',
  ) => {
    try {
      await updateDonation(id, status)
      toast.success(`Donation marked ${status}.`)
      notifyChanged()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update the donation.')
    }
  }

  const devotee = detail?.devotee
  const target = detail?.target ?? 100000
  const count = detail?.chantCount ?? 0
  const pct = Math.min(100, target > 0 ? (count / target) * 100 : 0)

  return (
    <Drawer
      open={devoteeId !== null}
      icon={User}
      title={devotee?.fullName ?? (loading ? 'Loading…' : 'Devotee')}
      subtitle={devotee ? formatMobile(devotee.mobile) : undefined}
      onClose={onClose}
      footer={
        devotee && (
          <div className="flex flex-wrap justify-end gap-2">
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={Pencil}
                isDisabled={busy}
                onPress={() => onEdit(devotee)}
              >
                Edit profile
              </Button>
            )}
            <Button
              size="sm"
              variant={devotee.isBlocked ? 'secondary' : 'danger-soft'}
              leftIcon={devotee.isBlocked ? CircleCheck : Ban}
              isPending={busy}
              onPress={toggleBlock}
            >
              {devotee.isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </div>
        )
      }
    >
      {loading && (
        <p className="py-16 text-center text-sm text-stone-400">Loading devotee…</p>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      {detail && devotee && (
        <>
          {/* Status strip */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {devotee.isBlocked && (
              <Badge tone="danger">
                <ShieldAlert size={12} /> Blocked
              </Badge>
            )}
            {detail.rank != null && (
              <Badge tone="warning">
                <Trophy size={12} /> Rank #{detail.rank}
              </Badge>
            )}
            {count >= target && <Badge tone="success">Goal reached</Badge>}
            <DonationBadge status={detail.donations[0]?.status ?? null} />
          </div>

          {/* Progress */}
          <div className="mb-4 rounded-2xl border border-stone-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-100">
                {formatNumber(count)}{' '}
                <span className="font-normal text-stone-400">
                  / {formatNumber(target)} chants
                </span>
              </span>
              <span className="text-sm font-bold text-brand-600 dark:text-brand-300">
                {pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                style={{ width: `${Math.max(pct, 0.5)}%` }}
              />
            </div>

            {adjusting ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  autoFocus
                  value={adjustValue}
                  onChange={e => setAdjustValue(e.target.value)}
                  className="h-9 w-32 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                />
                <Button size="sm" isPending={busy} onPress={saveCount}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onPress={() => setAdjustValue('0')}>
                  Reset to 0
                </Button>
                <Button size="sm" variant="ghost" onPress={() => setAdjusting(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAdjustValue(String(count))
                  setAdjusting(true)
                }}
                disabled={!devotee.userId}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40 dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/10"
                title={
                  devotee.userId
                    ? 'Set an exact chant count'
                    : 'This devotee has no linked login yet'
                }
              >
                <Pencil size={12} /> Adjust count
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.key === 'donations' && detail.donations.length > 0 && (
                    <span className="text-xs text-stone-400">
                      ({detail.donations.length})
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Metric
                  label="Malas"
                  value={formatNumber(Math.floor(count / 108))}
                  hint="108 chants each"
                />
                <Metric
                  label="Active days"
                  value={formatNumber(detail.activeDays)}
                  hint="days with chanting"
                />
                <Metric
                  label="Last chanted"
                  value={detail.lastChantAt ? formatRelative(detail.lastChantAt) : '—'}
                  hint={detail.lastChantAt ? formatDate(detail.lastChantAt) : undefined}
                />
                <Metric
                  label="Remaining"
                  value={formatNumber(Math.max(0, target - count))}
                  hint="to the personal goal"
                />
              </div>

              <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/70 px-4 dark:divide-white/5 dark:border-white/10">
                <Row label="Nakshatram" value={devotee.nakshatram || '—'} />
                <Row label="Gothram" value={devotee.gothram || '—'} />
                <Row label="Registered" value={formatDate(devotee.createdAt)} />
                <Row
                  label="First chant"
                  value={detail.firstChantAt ? formatDate(detail.firstChantAt) : '—'}
                />
                <Row
                  label="Account"
                  value={
                    devotee.isBlocked ? (
                      <Badge tone="danger">Blocked</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )
                  }
                />
              </div>

              {detail.adminActions.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-700 dark:text-stone-200">
                    <History size={15} /> Admin actions on this devotee
                  </h3>
                  <ul className="space-y-1.5">
                    {detail.adminActions.map((a, i) => (
                      <li
                        key={i}
                        className="rounded-xl border border-stone-200/70 px-3 py-2 text-sm dark:border-white/10"
                      >
                        <div className="text-stone-800 dark:text-stone-100">
                          {a.summary || a.action}
                        </div>
                        <div className="text-xs text-stone-400">
                          {a.actorName ?? 'Admin'} · {formatDateTime(a.createdAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'chants' && (
            <div>
              {!hasHistory ? (
                <p className="py-10 text-center text-sm text-stone-400">
                  Chant history needs a live backend.
                </p>
              ) : detail.logs.length === 0 ? (
                <p className="py-10 text-center text-sm text-stone-400">
                  No chant entries recorded yet.
                </p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-stone-400">
                    Latest {detail.logs.length} entries, newest first.
                  </p>
                  <ul className="space-y-1.5">
                    {detail.logs.map(log => {
                      const style = logStyle(log.amount, log.kind)
                      return (
                        <li
                          key={log.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-stone-200/70 px-3 py-2 dark:border-white/10"
                        >
                          <div className="min-w-0">
                            <Badge tone={style.tone}>{style.label}</Badge>
                            <div className="mt-1 text-xs text-stone-400">
                              {formatDateTime(log.createdAt)}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 text-sm font-bold ${
                              log.amount >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {log.amount >= 0 ? '+' : ''}
                            {formatNumber(log.amount)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          {tab === 'donations' && (
            <div>
              {detail.donations.length === 0 ? (
                <p className="py-10 text-center text-sm text-stone-400">
                  No seva donation submitted yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {detail.donations.map(d => (
                    <li
                      key={d.id}
                      className="rounded-2xl border border-stone-200/70 p-4 dark:border-white/10"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-base font-bold text-stone-900 dark:text-white">
                          {formatInr(d.amount)}
                        </span>
                        <DonationBadge status={d.status} />
                      </div>
                      <div className="space-y-1 text-xs text-stone-500">
                        <div>Submitted {formatDateTime(d.createdAt)}</div>
                        <div>UPI txn: {d.upiTxnId || '—'}</div>
                        {d.adminRemarks && <div>Remarks: {d.adminRemarks}</div>}
                        {d.verifiedAt && <div>Decided {formatDateTime(d.verifiedAt)}</div>}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <ScreenshotLink path={d.screenshotUrl} />
                        {d.status === 'pending' && (
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="danger-soft"
                              leftIcon={Ban}
                              isDisabled={busy}
                              onPress={() => decide(d.id, 'rejected')}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={Check}
                              isDisabled={busy}
                              onPress={() => decide(d.id, 'verified')}
                            >
                              Verify
                            </Button>
                          </div>
                        )}
                        {d.status === 'verified' && (
                          <Button
                            size="sm"
                            leftIcon={BadgeCheck}
                            isDisabled={busy}
                            onPress={() => decide(d.id, 'completed')}
                          >
                            Mark completed
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-stone-400">
                <CalendarDays size={12} /> Registered {formatDate(devotee.createdAt)}
              </p>
            </div>
          )}
        </>
      )}
    </Drawer>
  )
}
