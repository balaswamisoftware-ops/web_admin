import { useState } from 'react'
import { FileBarChart, Download, Users, Flame, HandCoins, Clock } from 'lucide-react'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { missionAdminService } from '../services/missionAdminService'
import { devoteesService } from '../services/devoteesService'
import { StatCard } from '../components/ui/StatCard'
import { Button } from '../components/ui'
import { exportCsv } from '../lib/exportCsv'
import { formatDate } from '../lib/format'

const num = (n: number) => n.toLocaleString('en-IN')

export function ReportsPage() {
  const { stats, loading } = useDashboardStats()
  const [busy, setBusy] = useState<string | null>(null)

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  const exportDevotees = () =>
    run('devotees', async () => {
      const rows = await devoteesService.list()
      exportCsv('devotees-report', rows, [
        { header: 'Full Name', value: d => d.fullName },
        { header: 'Mobile', value: d => d.mobile },
        { header: 'Nakshatram', value: d => d.nakshatram },
        { header: 'Gothram', value: d => d.gothram },
        { header: 'Blocked', value: d => (d.isBlocked ? 'Yes' : 'No') },
        { header: 'Registered', value: d => formatDate(d.createdAt) },
      ])
    })

  const exportChants = () =>
    run('chants', async () => {
      const rows = await missionAdminService.listChants()
      exportCsv('chant-report', rows, [
        { header: 'Devotee', value: c => c.fullName },
        { header: 'Mobile', value: c => c.mobile },
        { header: 'Chants', value: c => c.count },
        { header: 'Last updated', value: c => formatDate(c.updatedAt) },
      ])
    })

  const exportDonations = () =>
    run('donations', async () => {
      const rows = await missionAdminService.listDonations()
      exportCsv('donation-report', rows, [
        { header: 'Devotee', value: d => d.fullName },
        { header: 'Mobile', value: d => d.mobile },
        { header: 'Amount', value: d => d.amount },
        { header: 'UPI Txn ID', value: d => d.upiTxnId ?? '' },
        { header: 'Status', value: d => d.status },
        { header: 'Remarks', value: d => d.adminRemarks ?? '' },
        { header: 'Created', value: d => formatDate(d.createdAt) },
      ])
    })

  const v = <T,>(x: T) => (loading || !stats ? '—' : x)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <FileBarChart size={22} />
        </span>
        <div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">Reports</div>
          <div className="text-sm text-gray-500">Summary &amp; exports</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total devotees" value={v(num(stats?.totalDevotees ?? 0))} tint="bg-orange-100 text-orange-700" />
        <StatCard icon={Flame} label="Total chants" value={v(num(stats?.totalChants ?? 0))} tint="bg-rose-100 text-rose-700" />
        <StatCard icon={HandCoins} label="Verified donations" value={v(`₹${num(stats?.totalDonations ?? 0)}`)} tint="bg-emerald-100 text-emerald-700" />
        <StatCard icon={Clock} label="Pending donations" value={v(num(stats?.pendingVerifications ?? 0))} tint="bg-yellow-100 text-yellow-700" />
      </div>

      <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Export data (CSV / Excel)</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" leftIcon={Download} isPending={busy === 'devotees'} onPress={exportDevotees}>
            Devotees report
          </Button>
          <Button variant="secondary" leftIcon={Download} isPending={busy === 'chants'} onPress={exportChants}>
            Chant report
          </Button>
          <Button variant="secondary" leftIcon={Download} isPending={busy === 'donations'} onPress={exportDonations}>
            Donation report
          </Button>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          CSV files open directly in Excel / Google Sheets.
        </p>
      </div>
    </div>
  )
}
