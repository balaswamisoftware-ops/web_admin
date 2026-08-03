import { useEffect, useState } from 'react'
import {
  HandCoins,
  Search,
  RefreshCw,
  Download,
  X,
  Check,
  Ban,
  BadgeCheck,
  ImageOff,
} from 'lucide-react'
import type { Donation, DonationStatus } from '../types/mission'
import { useDonations } from '../hooks/useDonations'
import { missionAdminService } from '../services/missionAdminService'
import { Input, Button } from '../components/ui'
import { formatDate } from '../lib/format'
import { exportCsv } from '../lib/exportCsv'

const STATUS_STYLES: Record<DonationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  verified: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

function StatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

const FILTERS: { key: 'all' | DonationStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
]

function ReviewDialog({
  donation,
  busy,
  onClose,
  onDecision,
}: {
  donation: Donation
  busy: boolean
  onClose: () => void
  onDecision: (status: DonationStatus, remarks: string) => void
}) {
  const [remarks, setRemarks] = useState(donation.adminRemarks ?? '')
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(true)

  useEffect(() => {
    let active = true
    setImgLoading(true)
    if (!donation.screenshotUrl) {
      setImgUrl(null)
      setImgLoading(false)
      return
    }
    missionAdminService
      .screenshotUrl(donation.screenshotUrl)
      .then(url => active && setImgUrl(url))
      .finally(() => active && setImgLoading(false))
    return () => {
      active = false
    }
  }, [donation.screenshotUrl])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Verify payment
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Devotee</span><span className="font-medium text-gray-900 dark:text-white">{donation.fullName}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Mobile</span><span className="text-gray-800 dark:text-gray-200">{donation.mobile}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold text-gray-900 dark:text-white">₹{donation.amount}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">UPI Txn ID</span><span className="text-gray-800 dark:text-gray-200">{donation.upiTxnId || '—'}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusBadge status={donation.status} /></div>
        </div>

        {/* Screenshot */}
        <div className="mb-4 flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-2 dark:border-neutral-700 dark:bg-neutral-800">
          {imgLoading ? (
            <span className="text-sm text-gray-400">Loading screenshot…</span>
          ) : imgUrl ? (
            <a href={imgUrl} target="_blank" rel="noreferrer">
              <img src={imgUrl} alt="Payment screenshot" className="max-h-72 rounded-lg" />
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-gray-400">
              <ImageOff size={22} /> No screenshot uploaded
            </span>
          )}
        </div>

        <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-200">
          Admin remarks
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="danger-soft" leftIcon={Ban} isDisabled={busy} onPress={() => onDecision('rejected', remarks)}>
            Reject
          </Button>
          <Button variant="secondary" leftIcon={Check} isDisabled={busy} onPress={() => onDecision('verified', remarks)}>
            Verify
          </Button>
          <Button leftIcon={BadgeCheck} isPending={busy} onPress={() => onDecision('completed', remarks)}>
            Mark completed
          </Button>
        </div>
      </div>
    </div>
  )
}

export function PaymentsPage() {
  const {
    donations,
    total,
    pending,
    loading,
    error,
    busyId,
    filter,
    setFilter,
    query,
    setQuery,
    refresh,
    update,
  } = useDonations()

  const [review, setReview] = useState<Donation | null>(null)

  const onDecision = async (status: DonationStatus, remarks: string) => {
    if (!review) return
    await update(review.id, status, remarks)
    setReview(null)
  }

  const doExport = () =>
    exportCsv('donations', donations, [
      { header: 'Devotee', value: d => d.fullName },
      { header: 'Mobile', value: d => d.mobile },
      { header: 'Amount', value: d => d.amount },
      { header: 'UPI Txn ID', value: d => d.upiTxnId ?? '' },
      { header: 'Status', value: d => d.status },
      { header: 'Remarks', value: d => d.adminRemarks ?? '' },
      { header: 'Created', value: d => formatDate(d.createdAt) },
    ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <HandCoins size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              Payment Verification
            </div>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${total} donations · ${pending} pending`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={Download} onPress={doExport}>Export</Button>
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>Refresh</Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input label="Search" icon={Search} placeholder="Name, mobile or txn id" value={query} onChange={setQuery} />
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                filter === f.key
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading donations…</div>
      ) : donations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-neutral-700">
          No donations found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-900">
                <th className="px-4 py-3 font-semibold">Devotee</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Txn ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {donations.map(d => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{d.fullName}</div>
                    <div className="text-xs text-gray-400">{d.mobile}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{d.amount}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{d.upiTxnId || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="secondary" isPending={busyId === d.id} onPress={() => setReview(d)}>
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {review && (
        <ReviewDialog
          donation={review}
          busy={busyId === review.id}
          onClose={() => setReview(null)}
          onDecision={onDecision}
        />
      )}
    </div>
  )
}
