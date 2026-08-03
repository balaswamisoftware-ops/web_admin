import { useMemo } from 'react'
import { Users, Flame, Target, HandCoins, Clock, CalendarDays } from 'lucide-react'
import { useDevotees } from '../hooks/useDevotees'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useAdminAuth } from '../auth/AdminAuthProvider'
import { formatDate, formatMobile, formatIndianCompact } from '../lib/format'
import { StatCard } from '../components/ui/StatCard'
import {
  COMMUNITY_CHANT_TARGET,
  PERSONAL_CHANT_TARGET,
} from '../constants/mission'

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`
const num = (n: number) => n.toLocaleString('en-IN')

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const today = new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function DashboardPage() {
  const { devotees, total, loading } = useDevotees()
  const { stats, loading: statsLoading } = useDashboardStats()
  const { admin } = useAdminAuth()
  const firstName = admin?.fullName?.split(' ')[0] ?? 'Admin'

  const thisMonth = useMemo(() => {
    const now = new Date()
    return devotees.filter(d => {
      const c = new Date(d.createdAt)
      return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
    }).length
  }, [devotees])

  const recent = useMemo(() => devotees.slice(0, 5), [devotees])

  const s = <T,>(v: T) => (statsLoading || !stats ? '—' : v)

  // Community achievement: total chants across ALL devotees vs the 11 Cr goal.
  const totalChants = stats?.totalChants ?? 0
  const pct = Math.min(100, (totalChants / COMMUNITY_CHANT_TARGET) * 100)
  const communityRemaining = Math.max(0, COMMUNITY_CHANT_TARGET - totalChants)
  // Per-devotee personal goal (defaults to 1 Lakh; may be overridden in settings).
  const personalTarget = stats?.target && stats.target > 0
    ? stats.target
    : PERSONAL_CHANT_TARGET

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Greeting hero */}
      <section className="relative mb-7 overflow-hidden rounded-3xl border border-brand-200/50 bg-gradient-to-br from-brand-500 via-brand-600 to-maroon p-7 text-white shadow-xl shadow-brand-500/20">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-gold/25 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium text-white/80">{today}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              {greeting()}, {firstName}
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-white/85">
              Every devotee chants toward a{' '}
              <strong className="font-semibold">
                {formatIndianCompact(personalTarget)}
              </strong>{' '}
              personal goal — together we aim for{' '}
              <strong className="font-semibold">
                {formatIndianCompact(COMMUNITY_CHANT_TARGET)}
              </strong>{' '}
              chants.
            </p>
          </div>

          {/* Community mission progress (all devotees vs 11 Cr) */}
          <div className="min-w-[240px] rounded-2xl bg-white/15 p-4 backdrop-blur-md ring-1 ring-white/20">
            <div className="flex items-center justify-between text-xs font-medium text-white/80">
              <span>Community goal · {formatIndianCompact(COMMUNITY_CHANT_TARGET)}</span>
              <span>{pct.toFixed(2)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold to-white transition-all duration-700"
                style={{ width: `${Math.max(pct, 0.5)}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-white/80">
              {stats
                ? `${num(totalChants)} of ${num(COMMUNITY_CHANT_TARGET)} chants`
                : 'Loading…'}
            </div>
          </div>
        </div>
      </section>

      {/* Mission metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Registered devotees"
          value={loading ? '—' : total}
          tint="bg-brand-100 text-brand-700"
          hint={loading ? undefined : `${thisMonth} this month`}
        />
        <StatCard
          icon={Flame}
          label="Total chants"
          value={s(num(totalChants))}
          tint="bg-rose-100 text-rose-700"
          hint={stats ? `${pct.toFixed(2)}% of ${formatIndianCompact(COMMUNITY_CHANT_TARGET)}` : undefined}
        />
        <StatCard
          icon={Target}
          label="Remaining to 11 Cr"
          value={s(num(communityRemaining))}
          tint="bg-amber-100 text-amber-700"
          hint={stats ? `Goal: ${formatIndianCompact(COMMUNITY_CHANT_TARGET)}` : undefined}
        />
        <StatCard
          icon={HandCoins}
          label="Donations received"
          value={s(inr(stats?.totalDonations ?? 0))}
          tint="bg-emerald-100 text-emerald-700"
          hint={stats ? `${stats.verifiedDonations} verified` : undefined}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Pending verifications"
          value={s(num(stats?.pendingVerifications ?? 0))}
          tint="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          icon={CalendarDays}
          label="Joined this month"
          value={loading ? '—' : thisMonth}
          tint="bg-sky-100 text-sky-700"
        />
      </div>

      {/* Recent registrations */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Users size={16} />
            </span>
            <h2 className="text-base font-semibold text-stone-900 dark:text-white">
              Recent registrations
            </h2>
          </div>
          <span className="text-xs font-medium text-stone-400">Latest 5</span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-stone-400">Loading…</p>
        ) : recent.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-400">No devotees yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-white/5">
            {recent.map(d => (
              <li
                key={d.id}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-brand-50/40 dark:hover:bg-white/5"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 text-sm font-bold text-brand-700 ring-1 ring-brand-500/10">
                  {d.fullName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stone-900 dark:text-white">
                    {d.fullName}
                  </div>
                  <div className="text-xs text-stone-400">
                    {formatMobile(d.mobile)} · {d.nakshatram}
                  </div>
                </div>
                <div className="text-xs font-medium text-stone-400">
                  {formatDate(d.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
