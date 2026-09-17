import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Flame,
  RefreshCw,
  Search,
  UserCog,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import type {
  DevoteeAdminsOverview,
  DevoteeCandidate,
} from '../types/devoteeAdmin'
import { devoteeAdminsService } from '../services/devoteeAdminsService'
import {
  formatDate,
  formatIndianCompact,
  formatMobile,
  formatNumber,
  formatRelative,
} from '../lib/format'
import { Badge, Button, StatCard, useToast } from '../components/ui'
import { DevoteeAdminDrawer } from '../components/devoteeAdmins/DevoteeAdminDrawer'
import {
  DevoteeSearchDialog,
  type CandidateVerdict,
} from '../components/devoteeAdmins/DevoteeSearchDialog'

type StatusFilter = 'all' | 'active' | 'suspended'

/**
 * Devotee Admins — devotees appointed to lead a group. They register devotees
 * under themselves in the mobile app and record chants for them; this page is
 * where portal admins appoint them and see every group in detail.
 */
export function DevoteeAdminsPage() {
  const toast = useToast()
  const [data, setData] = useState<DevoteeAdminsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [appointOpen, setAppointOpen] = useState(false)

  useEffect(() => {
    let alive = true
    devoteeAdminsService
      .overview()
      .then(d => alive && (setData(d), setError(null)))
      .catch(e => alive && setError(e instanceof Error ? e.message : 'Could not load devotee admins.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [reloadToken])

  // Stable identities: the modal helper re-runs (and moves focus) whenever
  // these change, so they must not be recreated on every render.
  const refresh = useCallback(() => setReloadToken(t => t + 1), [])
  const closeDrawer = useCallback(() => setOpenUserId(null), [])
  const closeAppoint = useCallback(() => setAppointOpen(false), [])

  const rows = useMemo(() => {
    const list = data?.admins ?? []
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D/g, '')
    return list.filter(r => {
      if (status === 'active' && !r.isActive) return false
      if (status === 'suspended' && r.isActive) return false
      if (!q) return true
      return (
        r.fullName.toLowerCase().includes(q) ||
        (digits.length >= 3 && r.mobile.replace(/\D/g, '').includes(digits))
      )
    })
  }, [data, search, status])

  const evaluate = (c: DevoteeCandidate): CandidateVerdict => {
    if (!c.userId) return { actionLabel: '', blockedReason: 'Has no app account, so can’t sign in' }
    if (c.isDevoteeAdmin) return { actionLabel: '', blockedReason: 'Already a devotee admin' }
    if (c.isBlocked) return { actionLabel: '', blockedReason: 'Blocked — unblock them first' }
    if (c.managerUserId)
      return {
        actionLabel: '',
        blockedReason: `In ${c.managerName ?? 'another'}’s group — remove them from it first`,
      }
    return { actionLabel: 'Appoint' }
  }

  const appoint = async (c: DevoteeCandidate): Promise<string | null> => {
    try {
      await devoteeAdminsService.appoint(c.devoteeId)
      setAppointOpen(false)
      toast.success(`${c.fullName} is now a devotee admin.`)
      refresh()
      if (c.userId) setOpenUserId(c.userId)
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Could not appoint this devotee.'
    }
  }

  const summary = data?.summary
  const dash = (v: string) => (loading && !data ? '—' : v)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/20">
            <UserCog size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-white">Devotee Admins</h1>
            <p className="text-sm text-stone-500">
              Group leaders who register devotees and record their chants in the app
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
            Refresh
          </Button>
          <Button leftIcon={UserPlus} onPress={() => setAppointOpen(true)}>
            Appoint devotee admin
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={UserCog}
          label="Devotee admins"
          value={dash(formatNumber(summary?.admins ?? 0))}
          tint="bg-brand-100 text-brand-700"
          hint={summary ? `${formatNumber(summary.active)} active` : undefined}
        />
        <StatCard
          icon={UsersRound}
          label="Devotees in groups"
          value={dash(formatNumber(summary?.members ?? 0))}
          tint="bg-sky-100 text-sky-700"
        />
        <StatCard
          icon={Flame}
          label="Group chant total"
          value={dash(formatIndianCompact(summary?.groupChants ?? 0))}
          tint="bg-amber-100 text-amber-700"
          hint="Current totals of all group members"
        />
        <StatCard
          icon={Users}
          label="Entered this week"
          value={dash(formatIndianCompact(summary?.entered7d ?? 0))}
          tint="bg-emerald-100 text-emerald-700"
          hint="By devotee admins, last 7 days"
        />
      </div>

      {/* List */}
      {!loading && data && data.admins.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 px-6 py-14 text-center dark:border-neutral-700">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            <UserCog size={24} />
          </span>
          <h2 className="text-base font-semibold text-stone-900 dark:text-white">
            No devotee admins yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Appoint a trusted devotee to lead a group. In the app they’ll be able to register
            devotees under themselves and record chants for them — every entry is tracked here.
          </p>
          <div className="mt-5 flex justify-center">
            <Button leftIcon={UserPlus} onPress={() => setAppointOpen(true)}>
              Appoint devotee admin
            </Button>
          </div>
        </div>
      ) : (
        <section className="rounded-2xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="flex flex-wrap items-center gap-3 border-b border-stone-200/70 p-4 dark:border-white/10">
            <div className="relative min-w-[14rem] flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or mobile"
                aria-label="Search devotee admins"
                className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5" role="group" aria-label="Status">
              {(['all', 'active', 'suspended'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    status === s
                      ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-800 dark:text-white'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Devotee admin</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Devotees</th>
                  <th className="px-4 py-3 text-right font-semibold">Group total</th>
                  <th className="px-4 py-3 text-right font-semibold">Entered · 7d</th>
                  <th className="px-4 py-3 font-semibold">Last entry</th>
                  <th className="px-4 py-3 font-semibold">Appointed</th>
                </tr>
              </thead>
              <tbody>
                {loading && !data ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                      No devotee admin matches these filters.
                    </td>
                  </tr>
                ) : (
                  rows.map(r => (
                    <tr
                      key={r.userId}
                      onClick={() => setOpenUserId(r.userId)}
                      className="cursor-pointer border-t border-stone-100 transition-colors hover:bg-brand-50/50 dark:border-neutral-800 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                            {r.fullName.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-stone-900 dark:text-white">
                              {r.fullName}
                            </div>
                            <div className="text-xs text-stone-500">{formatMobile(r.mobile)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.isActive ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="warning">Suspended</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-stone-900 dark:text-white">
                        {formatNumber(r.members)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-200">
                        {formatNumber(r.groupChants)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-200">
                        {formatNumber(r.entered7d)}
                      </td>
                      <td className="px-4 py-3 text-stone-500">{formatRelative(r.lastEntryAt)}</td>
                      <td className="px-4 py-3 text-stone-500">
                        <div>{formatDate(r.appointedAt)}</div>
                        {r.appointedByName && (
                          <div className="text-xs text-stone-400">by {r.appointedByName}</div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {openUserId && (
        <DevoteeAdminDrawer
          key={openUserId}
          userId={openUserId}
          admins={data?.admins ?? []}
          onClose={closeDrawer}
          onChanged={refresh}
        />
      )}

      {appointOpen && (
        <DevoteeSearchDialog
          title="Appoint a devotee admin"
          description="Choose an existing devotee. They’ll be able to register devotees and record their chants in the app."
          icon={UserCog}
          evaluate={evaluate}
          onPick={appoint}
          onClose={closeAppoint}
        />
      )}
    </div>
  )
}
