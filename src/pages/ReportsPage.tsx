import { useState } from 'react'
import {
  FileBarChart,
  Download,
  Users,
  Flame,
  HandCoins,
  Clock,
  Trophy,
  Activity,
} from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useAnalytics } from '../hooks/useAnalytics'
import { missionAdminService } from '../services/missionAdminService'
import { devoteesService } from '../services/devoteesService'
import { StatCard, Button, DateRangePicker, useToast } from '../components/ui'
import { exportCsv } from '../lib/exportCsv'
import { formatDate, formatInr, formatNumber } from '../lib/format'
import {
  EMPTY_RANGE,
  describeRange,
  isRangeInvalid,
  rangeEnd,
  rangeStart,
  type DateRange,
} from '../lib/dateRange'

/** Filenames carry the range so two exports never look interchangeable. */
function suffix(range: DateRange): string {
  if (!range.from && !range.to) return 'all-time'
  return `${range.from || 'start'}_to_${range.to || 'today'}`
}

export function ReportsPage() {
  const { stats, loading } = useDashboardStats()
  const { analytics } = useAnalytics(30)
  const toast = useToast()
  const [range, setRange] = useState<DateRange>(EMPTY_RANGE)
  const [busy, setBusy] = useState<string | null>(null)

  const invalid = isRangeInvalid(range)
  const from = rangeStart(range)
  const to = rangeEnd(range)

  const run = async (key: string, fn: () => Promise<number>) => {
    if (invalid) {
      toast.error('Fix the date range first.')
      return
    }
    setBusy(key)
    try {
      const n = await fn()
      toast.success(`Exported ${formatNumber(n)} row(s) · ${describeRange(range)}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  const exportDevotees = () =>
    run('devotees', async () => {
      const { rows } = await devoteesService.page({
        from,
        to,
        sortKey: 'registered',
        sortDir: 'desc',
        page: 1,
        pageSize: 10000,
      })
      exportCsv(`devotees-${suffix(range)}`, rows, [
        { header: 'Full Name', value: d => d.fullName },
        { header: 'Mobile', value: d => d.mobile },
        { header: 'Nakshatram', value: d => d.nakshatram },
        { header: 'Gothram', value: d => d.gothram },
        { header: 'Chants', value: d => d.chantCount ?? 0 },
        { header: 'Seva', value: d => d.donationStatus ?? 'none' },
        { header: 'Blocked', value: d => (d.isBlocked ? 'Yes' : 'No') },
        { header: 'Registered', value: d => formatDate(d.createdAt) },
      ])
      return rows.length
    })

  const exportChants = () =>
    run('chants', async () => {
      const { rows } = await missionAdminService.listChantsPage({
        from,
        to,
        sortKey: 'chants',
        sortDir: 'desc',
        page: 1,
        pageSize: 10000,
      })
      exportCsv(`chants-${suffix(range)}`, rows, [
        { header: 'Rank', value: c => c.rank },
        { header: 'Devotee', value: c => c.fullName },
        { header: 'Mobile', value: c => c.mobile },
        { header: 'Chants', value: c => c.count },
        { header: 'Malas', value: c => Math.floor(c.count / 108) },
        { header: 'Last updated', value: c => formatDate(c.updatedAt) },
      ])
      return rows.length
    })

  const exportDonations = () =>
    run('donations', async () => {
      const { rows } = await missionAdminService.listDonationsPage({
        from,
        to,
        sortKey: 'date',
        sortDir: 'desc',
        page: 1,
        pageSize: 10000,
      })
      exportCsv(`donations-${suffix(range)}`, rows, [
        { header: 'Devotee', value: d => d.fullName },
        { header: 'Mobile', value: d => d.mobile },
        { header: 'Amount', value: d => d.amount },
        { header: 'UPI Txn ID', value: d => d.upiTxnId ?? '' },
        { header: 'Status', value: d => d.status },
        { header: 'Duplicate txn', value: d => (d.dupTxn ? 'Yes' : 'No') },
        { header: 'Amount mismatch', value: d => (d.amountMismatch ? 'Yes' : 'No') },
        { header: 'Remarks', value: d => d.adminRemarks ?? '' },
        { header: 'Created', value: d => formatDate(d.createdAt) },
        { header: 'Decided', value: d => (d.verifiedAt ? formatDate(d.verifiedAt) : '') },
      ])
      return rows.length
    })

  const exportLeaderboard = () =>
    run('leaderboard', async () => {
      const { rows } = await missionAdminService.leaderboard(10000, 1)
      exportCsv(`leaderboard-${suffix(range)}`, rows, [
        { header: 'Rank', value: r => r.rank },
        { header: 'Devotee', value: r => r.fullName },
        { header: 'Mobile', value: r => r.mobile },
        { header: 'Chants', value: r => r.count },
        { header: 'Malas', value: r => r.malas },
        { header: 'Percent of goal', value: r => `${r.pct}%` },
        { header: 'Goal reached', value: r => (r.completed ? 'Yes' : 'No') },
        { header: 'Seva', value: r => r.donationStatus ?? 'none' },
      ])
      return rows.length
    })

  const exportDailyActivity = () =>
    run('activity', async () => {
      if (!analytics) throw new Error('Analytics are still loading.')
      const rows = analytics.dailyChants.map((d, i) => ({
        date: d.date,
        chants: d.value,
        registrations: analytics.dailyRegistrations[i]?.value ?? 0,
      }))
      exportCsv(`daily-activity-last-${analytics.days}-days`, rows, [
        { header: 'Date', value: r => r.date },
        { header: 'Chants', value: r => r.chants },
        { header: 'New devotees', value: r => r.registrations },
      ])
      return rows.length
    })

  const v = <T,>(x: T) => (loading || !stats ? '—' : x)

  const EXPORTS: {
    key: string
    label: string
    description: string
    run: () => void
    ranged: boolean
  }[] = [
    {
      key: 'devotees',
      label: 'Devotees',
      description: 'Profiles, chant totals and seva status',
      run: exportDevotees,
      ranged: true,
    },
    {
      key: 'chants',
      label: 'Chant counts',
      description: 'Per-devotee totals with rank',
      run: exportChants,
      ranged: true,
    },
    {
      key: 'donations',
      label: 'Donations',
      description: 'Seva payments with duplicate/mismatch flags',
      run: exportDonations,
      ranged: true,
    },
    {
      key: 'leaderboard',
      label: 'Leaderboard',
      description: 'Ranked chanters and goal completion',
      run: exportLeaderboard,
      ranged: false,
    },
    {
      key: 'activity',
      label: 'Daily activity',
      description: 'Chants and registrations per day (last 30)',
      run: exportDailyActivity,
      ranged: false,
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <FileBarChart size={22} />
        </span>
        <div>
          <div className="text-xl font-bold text-stone-900 dark:text-white">Reports</div>
          <div className="text-sm text-stone-500">Summary &amp; exports</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total devotees"
          value={v(formatNumber(stats?.totalDevotees ?? 0))}
          tint="bg-orange-100 text-orange-700"
        />
        <StatCard
          icon={Flame}
          label="Total chants"
          value={v(formatNumber(stats?.totalChants ?? 0))}
          tint="bg-rose-100 text-rose-700"
        />
        <StatCard
          icon={HandCoins}
          label="Donations"
          value={v(formatInr(stats?.totalDonations ?? 0))}
          tint="bg-emerald-100 text-emerald-700"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={v(formatNumber(stats?.pendingVerifications ?? 0))}
          tint="bg-yellow-100 text-yellow-700"
        />
      </div>

      {analytics && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            icon={Trophy}
            label="Reached personal goal"
            value={formatNumber(analytics.funnel.completed)}
            tint="bg-amber-100 text-amber-700"
            hint={`${formatNumber(analytics.funnel.donated)} donated`}
          />
          <StatCard
            icon={Activity}
            label="Chants this month"
            value={formatNumber(analytics.activity.month)}
            tint="bg-sky-100 text-sky-700"
            hint={`${formatNumber(analytics.activity.activeDevotees30d)} active devotees`}
          />
        </div>
      )}

      {/* Date range */}
      <section className="mt-8 rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/70">
        <h2 className="mb-1 text-[15px] font-semibold text-stone-900 dark:text-white">
          Report period
        </h2>
        <p className="mb-4 text-xs text-stone-500">
          Applies to devotees (by registration date), chants (by last activity) and
          donations (by submission date). Leaderboard and daily activity always
          reflect current standings.
        </p>
        <DateRangePicker value={range} onChange={setRange} label="records" />
      </section>

      {/* Exports */}
      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EXPORTS.map(item => (
          <div
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200/70 bg-white/80 p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900/70"
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-stone-900 dark:text-white">
                {item.label}
              </div>
              <div className="text-xs text-stone-500">{item.description}</div>
              <div className="mt-0.5 text-[11px] text-stone-400">
                {item.ranged ? describeRange(range) : 'all time'}
              </div>
            </div>
            <Button
              variant="secondary"
              leftIcon={Download}
              isPending={busy === item.key}
              isDisabled={invalid}
              onPress={item.run}
            >
              CSV
            </Button>
          </div>
        ))}
      </section>
    </div>
  )
}
