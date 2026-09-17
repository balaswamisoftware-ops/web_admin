import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRightLeft,
  CalendarDays,
  Flame,
  PauseCircle,
  PlayCircle,
  Search,
  ShieldOff,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react'
import type {
  DevoteeAdminDetail,
  DevoteeAdminRow,
  DevoteeCandidate,
  GroupMember,
} from '../../types/devoteeAdmin'
import { devoteeAdminsService } from '../../services/devoteeAdminsService'
import { levelFor } from '../../lib/levels'
import {
  formatDate,
  formatDateTime,
  formatIndianCompact,
  formatMobile,
  formatNumber,
  formatRelative,
} from '../../lib/format'
import { Badge, BarChart, Button, Drawer, useToast } from '../ui'
import { ConfirmDialog } from '../devotees/ConfirmDialog'
import { DevoteeSearchDialog, type CandidateVerdict } from './DevoteeSearchDialog'

type Confirm = { kind: 'revoke' } | { kind: 'remove'; member: GroupMember } | null

const selectCls =
  'h-9 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2.5 text-sm text-stone-900 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-stone-200/70 p-3 dark:border-white/10">
      <div className="flex items-center gap-1.5 text-xs text-stone-500">
        <Icon size={13} /> {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums text-stone-900 dark:text-white">
        {value}
      </div>
    </div>
  )
}

/**
 * Everything about one Devotee Admin: their standing, group members, the
 * entries they've made, and the actions a portal admin can take. Mount with
 * `key={userId}` so switching admins starts from a clean state.
 */
export function DevoteeAdminDrawer({
  userId,
  admins,
  onClose,
  onChanged,
}: {
  userId: string
  /** All admins from the overview — the "move to" choices. */
  admins: DevoteeAdminRow[]
  onClose: () => void
  /** Called after any change, so the overview can refresh. */
  onChanged: () => void
}) {
  const toast = useToast()
  const [detail, setDetail] = useState<DevoteeAdminDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [tab, setTab] = useState<'members' | 'entries'>('members')
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [moving, setMoving] = useState<{ devoteeId: string; target: string } | null>(null)

  useEffect(() => {
    let alive = true
    devoteeAdminsService
      .detail(userId)
      .then(d => alive && (setDetail(d), setError(null)))
      .catch(e => alive && setError(e instanceof Error ? e.message : 'Could not load this group.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [userId, reloadToken])

  const reload = () => {
    setReloadToken(t => t + 1)
    onChanged()
  }

  // The modal helper listens for Escape on the whole document. While a dialog
  // is open on top, Escape should close only that dialog, not this drawer too.
  const dialogOpen = confirm !== null || searchOpen
  const dialogOpenRef = useRef(false)
  useEffect(() => {
    dialogOpenRef.current = dialogOpen
  }, [dialogOpen])
  const guardedClose = useCallback(() => {
    if (!dialogOpenRef.current) onClose()
  }, [onClose])
  const closeConfirm = useCallback(() => setConfirm(null), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])

  const a = detail?.admin
  const moveTargets = admins.filter(x => x.isActive && x.userId !== userId)

  const members = useMemo(() => {
    const list = detail?.members ?? []
    const q = filter.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    if (!q) return list
    return list.filter(
      m =>
        m.fullName.toLowerCase().includes(q) ||
        (digits.length >= 3 && m.mobile.replace(/\D/g, '').includes(digits)),
    )
  }, [detail, filter])

  const entered30d = detail?.daily.reduce((sum, d) => sum + d.chants, 0) ?? 0
  const groupChants = detail?.members.reduce((sum, m) => sum + m.count, 0) ?? 0
  const chart = (detail?.daily ?? []).slice(-14).map(d => ({
    label: String(Number(d.day.slice(8, 10))),
    value: d.chants,
  }))

  /* ── Actions ────────────────────────────────────────────────────────────── */

  const run = async (key: string, action: () => Promise<string>) => {
    setBusy(key)
    try {
      toast.success(await action())
      reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setBusy(null)
    }
  }

  const toggleActive = () => {
    if (!a) return
    void run('active', async () => {
      await devoteeAdminsService.setActive(a.userId, !a.isActive)
      return a.isActive
        ? `${a.fullName} is suspended. Their group stays intact.`
        : `${a.fullName} is active again.`
    })
  }

  const onConfirm = async () => {
    if (!confirm || !a) return
    const current = confirm
    setConfirm(null)
    if (current.kind === 'revoke') {
      setBusy('revoke')
      try {
        const released = await devoteeAdminsService.revoke(a.userId)
        toast.success(
          `${a.fullName} is no longer a devotee admin. ${formatNumber(released)} devotee(s) left the group.`,
        )
        onChanged()
        onClose()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not revoke the role.')
        setBusy(null)
      }
      return
    }
    await run(`remove:${current.member.devoteeId}`, async () => {
      await devoteeAdminsService.setGroup(current.member.devoteeId, null)
      return `${current.member.fullName} was removed from the group.`
    })
  }

  const doMove = async () => {
    if (!moving?.target) return
    const member = detail?.members.find(m => m.devoteeId === moving.devoteeId)
    const target = admins.find(x => x.userId === moving.target)
    const { devoteeId, target: targetId } = moving
    setMoving(null)
    await run(`move:${devoteeId}`, async () => {
      await devoteeAdminsService.setGroup(devoteeId, targetId)
      return `${member?.fullName ?? 'Devotee'} moved to ${target?.fullName ?? 'the new'}’s group.`
    })
  }

  const evaluate = (c: DevoteeCandidate): CandidateVerdict => {
    if (!c.userId) return { actionLabel: '', blockedReason: 'Has no app account' }
    if (c.userId === userId) return { actionLabel: '', blockedReason: 'Leads this group' }
    if (c.isBlocked) return { actionLabel: '', blockedReason: 'Blocked devotee' }
    if (c.isDevoteeAdmin) return { actionLabel: '', blockedReason: 'Leads their own group' }
    if (c.managerUserId === userId) return { actionLabel: '', blockedReason: 'Already in this group' }
    if (c.managerUserId)
      return { actionLabel: 'Move here', note: `Currently in ${c.managerName ?? 'another'}’s group` }
    return { actionLabel: 'Add to group' }
  }

  const addMember = async (c: DevoteeCandidate): Promise<string | null> => {
    try {
      await devoteeAdminsService.setGroup(c.devoteeId, userId)
      setSearchOpen(false)
      toast.success(`${c.fullName} added to the group.`)
      reload()
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not add this devotee.'
    }
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <>
      <Drawer
        open
        title={a?.fullName ?? 'Devotee admin'}
        subtitle={a ? formatMobile(a.mobile) : undefined}
        icon={UserCog}
        onClose={guardedClose}
        footer={
          a && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="secondary"
                leftIcon={a.isActive ? PauseCircle : PlayCircle}
                isPending={busy === 'active'}
                onPress={toggleActive}
              >
                {a.isActive ? 'Suspend' : 'Reactivate'}
              </Button>
              <Button
                variant="danger"
                leftIcon={ShieldOff}
                isPending={busy === 'revoke'}
                onPress={() => setConfirm({ kind: 'revoke' })}
              >
                Revoke role
              </Button>
            </div>
          )
        }
      >
        {loading ? (
          <p className="py-16 text-center text-sm text-stone-400">Loading group…</p>
        ) : error || !detail || !a ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error ?? 'Could not load this group.'}</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Standing */}
            <div className="rounded-xl bg-stone-50 p-3.5 dark:bg-white/5">
              <div className="flex flex-wrap items-center gap-2">
                {a.isActive ? (
                  <Badge tone="success">Active</Badge>
                ) : (
                  <Badge tone="warning">Suspended {a.suspendedAt ? formatRelative(a.suspendedAt) : ''}</Badge>
                )}
                <span className="text-xs text-stone-500">
                  Appointed {formatDate(a.appointedAt)}
                  {a.appointedByName ? ` by ${a.appointedByName}` : ''}
                </span>
              </div>
              <div className="mt-2 text-xs text-stone-500">
                {a.nakshatram} · {a.gothram} · their own chants {formatNumber(a.ownCount)}
              </div>
              {!a.isActive && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  While suspended they can’t add devotees or record chants. Their group and
                  history are kept.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <MiniStat icon={Users} label="Devotees" value={formatNumber(detail.members.length)} />
              <MiniStat icon={Flame} label="Group chants" value={formatIndianCompact(groupChants)} />
              <MiniStat icon={UserCog} label="Entered · 30 days" value={formatIndianCompact(entered30d)} />
              <MiniStat
                icon={CalendarDays}
                label="Last entry"
                value={detail.entries[0] ? formatRelative(detail.entries[0].createdAt) : '—'}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-400">
                Chants entered · last 14 days
              </p>
              {entered30d === 0 ? (
                <p className="rounded-xl border border-dashed border-stone-200 py-6 text-center text-xs text-stone-400 dark:border-white/10">
                  No chants entered in the last 30 days.
                </p>
              ) : (
                <BarChart data={chart} height={120} />
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5">
              {(
                [
                  ['members', `Devotees (${detail.members.length})`],
                  ['entries', `Entries (${detail.entries.length})`],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === key
                      ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'members' ? (
              <div>
                <div className="mb-3 flex gap-2">
                  {detail.members.length > 6 && (
                    <div className="relative flex-1">
                      <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                      />
                      <input
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Filter by name or mobile"
                        aria-label="Filter devotees"
                        className="h-9 w-full rounded-lg border border-stone-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                      />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={UserPlus}
                    isDisabled={!a.isActive}
                    onPress={() => setSearchOpen(true)}
                  >
                    Add devotee
                  </Button>
                </div>

                {detail.members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-200 px-4 py-8 text-center dark:border-white/10">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
                      No devotees in this group yet
                    </p>
                    <p className="mt-1 text-xs text-stone-400">
                      They’ll appear here as {a.fullName} registers devotees in the app, or add
                      an existing devotee above.
                    </p>
                  </div>
                ) : members.length === 0 ? (
                  <p className="py-6 text-center text-sm text-stone-400">No devotee matches “{filter}”.</p>
                ) : (
                  <ul className="space-y-2">
                    {members.map(m => {
                      const level = levelFor(m.count, detail.levels)
                      const isMoving = moving?.devoteeId === m.devoteeId
                      return (
                        <li
                          key={m.devoteeId}
                          className="rounded-xl border border-stone-200/70 p-3 dark:border-white/10"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                              {m.fullName.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-stone-900 dark:text-white">
                                  {m.fullName}
                                </span>
                                {m.isBlocked && <Badge tone="danger">Blocked</Badge>}
                              </div>
                              <div className="text-xs text-stone-500">
                                {formatMobile(m.mobile)} · {m.nakshatram}
                              </div>
                              <div className="mt-0.5 text-[11px] text-stone-400">
                                {formatNumber(m.enteredByAdmin)} entered by {a.fullName.split(' ')[0]} ·
                                last chant {formatRelative(m.lastEntryAt)}
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-sm font-bold tabular-nums text-stone-900 dark:text-white">
                                {formatNumber(m.count)}
                              </div>
                              {level && <div className="text-[11px] text-stone-500">{level.name}</div>}
                            </div>
                          </div>

                          {isMoving ? (
                            <div className="mt-2.5 flex items-center gap-2">
                              <select
                                className={selectCls}
                                value={moving.target}
                                onChange={e => setMoving({ devoteeId: m.devoteeId, target: e.target.value })}
                                aria-label={`Move ${m.fullName} to`}
                              >
                                <option value="">Move to…</option>
                                {moveTargets.map(t => (
                                  <option key={t.userId} value={t.userId}>
                                    {t.fullName} ({formatNumber(t.members)})
                                  </option>
                                ))}
                              </select>
                              <Button size="sm" isDisabled={!moving.target} onPress={doMove}>
                                Move
                              </Button>
                              <Button size="sm" variant="ghost" onPress={() => setMoving(null)}>
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-2 flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={ArrowRightLeft}
                                isDisabled={moveTargets.length === 0}
                                isPending={busy === `move:${m.devoteeId}`}
                                onPress={() => setMoving({ devoteeId: m.devoteeId, target: '' })}
                              >
                                Move
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                leftIcon={UserMinus}
                                isPending={busy === `remove:${m.devoteeId}`}
                                onPress={() => setConfirm({ kind: 'remove', member: m })}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ) : detail.entries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 py-8 text-center text-sm text-stone-400 dark:border-white/10">
                {a.fullName} hasn’t recorded any chants yet.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200/70 dark:divide-white/5 dark:border-white/10">
                {detail.entries.map(e => (
                  <li key={e.logId} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-stone-900 dark:text-white">
                        {e.memberName ?? 'Removed devotee'}
                      </div>
                      <div className="text-xs text-stone-500">
                        {formatDateTime(e.createdAt)}
                        {e.undoneAt && ` · undone ${formatRelative(e.undoneAt)}`}
                      </div>
                    </div>
                    {e.undoneAt && <Badge tone="neutral">Undone</Badge>}
                    <span
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        e.undoneAt
                          ? 'text-stone-400 line-through'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      +{formatNumber(e.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'revoke' ? 'Revoke devotee admin role?' : 'Remove from group?'}
        message={
          confirm?.kind === 'revoke'
            ? `${a?.fullName ?? 'This devotee'} will no longer be able to add devotees or record chants. The ${formatNumber(detail?.members.length ?? 0)} devotee(s) in the group stay registered with all their chants — they just leave the group.`
            : confirm?.kind === 'remove'
              ? `${confirm.member.fullName} stays a registered devotee with all ${formatNumber(confirm.member.count)} chants, but ${a?.fullName ?? 'the group admin'} will no longer be able to record chants for them.`
              : ''
        }
        confirmLabel={confirm?.kind === 'revoke' ? 'Revoke role' : 'Remove'}
        loading={false}
        onConfirm={onConfirm}
        onCancel={closeConfirm}
      />

      {searchOpen && (
        <DevoteeSearchDialog
          title={`Add a devotee to ${a?.fullName ?? 'this'}’s group`}
          description="Existing devotees only. New devotees are registered by the group admin in the app."
          icon={UserPlus}
          evaluate={evaluate}
          onPick={addMember}
          onClose={closeSearch}
        />
      )}
    </>
  )
}
