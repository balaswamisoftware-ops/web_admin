import { useEffect, useState } from 'react'
import {
  Users,
  Flame,
  Target,
  HandCoins,
  Clock,
  AlertCircle,
  TrendingUp,
  Activity,
  CalendarClock,
  UserCheck,
  Filter,
} from 'lucide-react'
import type { Devotee } from '../types/devotee'
import { devoteesService } from '../services/devoteesService'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useAnalytics } from '../hooks/useAnalytics'
import { useAdminAuth } from '../auth/AdminAuthProvider'
import {
  formatDate,
  formatInr,
  formatMobile,
  formatIndianCompact,
  formatNumber,
} from '../lib/format'
import { StatCard, LineChart } from '../components/ui'
import {
  COMMUNITY_CHANT_TARGET,
  PERSONAL_CHANT_TARGET,
} from '../constants/mission'

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

/**
 * Registered → chanted → goal reached → donated, each stage as a share bar.
 * Bars grow from zero on mount, staggered top to bottom, so the drop-off
 * between stages reads as a movement rather than four static widths.
 */
const FUNNEL_CSS = `
  @keyframes funnel-grow { from { width: 0 } to { width: var(--target-w) } }
  .funnel-bar { width: var(--target-w); animation: funnel-grow 850ms cubic-bezier(.22,.61,.36,1) both }
  @media (prefers-reduced-motion: reduce) {
    .funnel-bar { animation: none }
  }
`

function Funnel({
  stages,
}: {
  stages: { label: string; value: number; tint: string }[]
}) {
  const top = Math.max(1, stages[0]?.value ?? 1)
  return (
    <div className="space-y-3">
      <style>{FUNNEL_CSS}</style>
      {stages.map((stage, i) => {
        const pct = (stage.value / top) * 100
        return (
          <div key={stage.label}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-stone-700 dark:text-stone-200">
                {stage.label}
              </span>
              <span className="text-stone-500">
                <strong className="text-stone-900 dark:text-white">
                  {formatNumber(stage.value)}
                </strong>{' '}
                <span className="text-xs">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100 dark:bg-white/10">
              <div
                className={`funnel-bar h-full rounded-full ${stage.tint}`}
                style={
                  {
                    '--target-w': `${Math.max(pct, 1)}%`,
                    animationDelay: `${i * 90}ms`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DashboardPage() {
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats()
  const { analytics, loading: analyticsLoading, error: analyticsError } = useAnalytics(30)
  const { admin } = useAdminAuth()

  const [recent, setRecent] = useState<Devotee[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [recentError, setRecentError] = useState<string | null>(null)

  // The "latest 5" list is its own tiny query now that the page no longer holds
  // the full devotee table in memory.
  useEffect(() => {
    let active = true
    devoteesService
      .page({ sortKey: 'registered', sortDir: 'desc', page: 1, pageSize: 5 })
      .then(res => active && setRecent(res.rows))
      .catch(
        e =>
          active &&
          setRecentError(e instanceof Error ? e.message : 'Failed to load devotees.'),
      )
      .finally(() => active && setRecentLoading(false))
    return () => {
      active = false
    }
  }, [])

  const loadError = statsError || analyticsError || recentError
  const firstName = admin?.fullName?.split(' ')[0] ?? 'Admin'

  const s = <T,>(v: T) => (statsLoading || !stats ? '—' : v)
  const a = <T,>(v: T) => (analyticsLoading || !analytics ? '—' : v)

  // Community achievement: total chants across ALL devotees vs the 11 Cr goal.
  const totalChants = stats?.totalChants ?? 0
  const pct = Math.min(100, (totalChants / COMMUNITY_CHANT_TARGET) * 100)
  const communityRemaining = Math.max(0, COMMUNITY_CHANT_TARGET - totalChants)
  const personalTarget =
    stats?.target && stats.target > 0 ? stats.target : PERSONAL_CHANT_TARGET

  const projection = analytics?.projection
  const projectedLabel = projection?.targetDate
    ? formatDate(projection.targetDate)
    : projection && projection.avgPerDay > 0
      ? 'Beyond 100 years'
      : 'No recent activity'

  const registrations30d =
    analytics?.dailyRegistrations.reduce((sum, d) => sum + d.value, 0) ?? 0

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
          <div className="min-w-[240px] rounded-2xl bg-white/15 p-4 ring-1 ring-white/20 backdrop-blur-md">
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
                ? `${formatNumber(totalChants)} of ${formatNumber(COMMUNITY_CHANT_TARGET)} chants`
                : 'Loading…'}
            </div>
            {projection && (
              <div className="mt-2 border-t border-white/20 pt-2 text-xs text-white/80">
                At {formatNumber(projection.avgPerDay)}/day → <strong>{projectedLabel}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      {loadError && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0" />
          <span>Couldn’t load dashboard data: {loadError}</span>
        </div>
      )}

      {/* Mission metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Registered devotees"
          value={s(formatNumber(stats?.totalDevotees ?? 0))}
          tint="bg-brand-100 text-brand-700"
          hint={
            analyticsLoading ? undefined : `${formatNumber(registrations30d)} in 30 days`
          }
        />
        <StatCard
          icon={Flame}
          label="Total chants"
          value={s(formatNumber(totalChants))}
          tint="bg-rose-100 text-rose-700"
          hint={
            stats
              ? `${pct.toFixed(2)}% of ${formatIndianCompact(COMMUNITY_CHANT_TARGET)}`
              : undefined
          }
        />
        <StatCard
          icon={Target}
          label="Remaining to 11 Cr"
          value={s(formatNumber(communityRemaining))}
          tint="bg-amber-100 text-amber-700"
          hint={stats ? `Goal: ${formatIndianCompact(COMMUNITY_CHANT_TARGET)}` : undefined}
        />
        <StatCard
          icon={HandCoins}
          label="Donations received"
          value={s(formatInr(stats?.totalDonations ?? 0))}
          tint="bg-emerald-100 text-emerald-700"
          hint={stats ? `${stats.verifiedDonations} verified` : undefined}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clock}
          label="Pending verifications"
          value={s(formatNumber(stats?.pendingVerifications ?? 0))}
          tint="bg-yellow-100 text-yellow-700"
        />
        <StatCard
          icon={Activity}
          label="Chants today"
          value={a(formatNumber(analytics?.activity.today ?? 0))}
          tint="bg-sky-100 text-sky-700"
          hint={
            analytics ? `${formatNumber(analytics.activity.week)} this week` : undefined
          }
        />
        <StatCard
          icon={UserCheck}
          label="Active devotees"
          value={a(formatNumber(analytics?.activity.activeDevotees30d ?? 0))}
          tint="bg-violet-100 text-violet-700"
          hint={
            analytics
              ? `${formatNumber(analytics.activity.activeDevotees7d)} this week`
              : undefined
          }
        />
        <StatCard
          icon={CalendarClock}
          label="Projected 11 Cr date"
          value={a(projectedLabel)}
          tint="bg-teal-100 text-teal-700"
          hint={
            analytics && projection?.daysToTarget != null
              ? `${formatNumber(projection.daysToTarget)} days at today’s pace`
              : undefined
          }
        />
      </div>

      {/* Velocity */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <Flame size={16} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">
                Chant velocity
              </h2>
              <p className="text-xs text-stone-400">Chants logged per day · last 30 days</p>
            </div>
          </div>
          {analyticsLoading ? (
            <p className="py-10 text-center text-sm text-stone-400">Loading…</p>
          ) : (
            <LineChart
              data={analytics?.dailyChants ?? []}
              className="text-rose-500"
              format={formatNumber}
            />
          )}
        </div>

        <div className="rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <TrendingUp size={16} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">
                New registrations
              </h2>
              <p className="text-xs text-stone-400">Devotees joined per day · last 30 days</p>
            </div>
          </div>
          {analyticsLoading ? (
            <p className="py-10 text-center text-sm text-stone-400">Loading…</p>
          ) : (
            <LineChart
              data={analytics?.dailyRegistrations ?? []}
              className="text-brand-500"
              format={formatNumber}
            />
          )}
        </div>
      </div>

      {/* Funnel + recent */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Filter size={16} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-stone-900 dark:text-white">
                Devotee journey
              </h2>
              <p className="text-xs text-stone-400">
                Registered → chanting → goal reached → seva donated
              </p>
            </div>
          </div>
          {analyticsLoading || !analytics ? (
            <p className="py-10 text-center text-sm text-stone-400">Loading…</p>
          ) : (
            <>
              <Funnel
                stages={[
                  {
                    label: 'Registered',
                    value: analytics.funnel.registered,
                    tint: 'bg-brand-500',
                  },
                  {
                    label: 'Started chanting',
                    value: analytics.funnel.chanted,
                    tint: 'bg-rose-500',
                  },
                  {
                    label: 'Reached personal goal',
                    value: analytics.funnel.completed,
                    tint: 'bg-amber-500',
                  },
                  {
                    label: 'Seva donated',
                    value: analytics.funnel.donated,
                    tint: 'bg-emerald-500',
                  },
                ]}
              />
              <p className="mt-4 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-500 dark:bg-white/5">
                {formatNumber(analytics.activity.dormant30d)} devotee(s) haven’t chanted
                in 30 days — a broadcast is the fastest way to reach them.
              </p>
            </>
          )}
        </div>

        {/* Recent registrations */}
        <div className="overflow-hidden rounded-2xl border border-stone-200/70 bg-white/80 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
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

          {recentLoading ? (
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
    </div>
  )
}
