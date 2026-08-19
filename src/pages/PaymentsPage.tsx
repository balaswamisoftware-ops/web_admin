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
  CopyX,
  TriangleAlert,
  User,
} from 'lucide-react'
import type { Donation, DonationStatus, DuplicateTxn } from '../types/mission'
import { useDonations, type DonationFilter } from '../hooks/useDonations'
import { useModalA11y } from '../hooks/useModalA11y'
import { missionAdminService } from '../services/missionAdminService'
import {
  Badge,
  Button,
  DateRangePicker,
  DonationBadge,
  Input,
  Pagination,
  SortableHeader,
  useToast,
  type Column,
} from '../components/ui'
import { DevoteeDrawer } from '../components/devotees/DevoteeDrawer'
import { formatDate, formatDateTime, formatInr, formatNumber } from '../lib/format'
import { describeRange } from '../lib/dateRange'
import { exportCsv } from '../lib/exportCsv'

const FILTERS: { key: DonationFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'verified', label: 'Verified' },
  { key: 'completed', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
]

const COLUMNS: Column[] = [
  { key: 'devotee', label: 'Devotee' },
  { key: 'amount', label: 'Amount', numeric: true },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Date' },
]

/* ── Review dialog ────────────────────────────────────────────────────────── */

function ReviewDialog({
  donation,
  busy,
  onClose,
  onDecision,
  onOpenDevotee,
}: {
  donation: Donation
  busy: boolean
  onClose: () => void
  onDecision: (status: DonationStatus, remarks: string) => void
  onOpenDevotee: () => void
}) {
  const [remarks, setRemarks] = useState(donation.adminRemarks ?? '')
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(true)
  const [acting, setActing] = useState<DonationStatus | null>(null)
  const ref = useModalA11y(true, onClose)

  const decide = (status: DonationStatus) => {
    setActing(status)
    onDecision(status, remarks)
  }

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
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Verify payment"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Verify payment</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>

        {/* Anything the admin should see BEFORE approving money goes here. */}
        {(donation.dupTxn || donation.amountMismatch) && (
          <div className="mb-4 space-y-2">
            {donation.dupTxn && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                <CopyX size={17} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Duplicate UPI reference.</strong> This transaction id is
                  already on another donation — check both before verifying.
                </span>
              </div>
            )}
            {donation.amountMismatch && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert size={17} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Amount mismatch.</strong> Paid {formatInr(donation.amount)},
                  seva amount is {formatInr(donation.expectedAmount)}.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="mb-4 space-y-1 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Devotee</span>
            <button
              type="button"
              onClick={onOpenDevotee}
              className="inline-flex items-center gap-1 font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {donation.fullName} <User size={13} />
            </button>
          </div>
          <div className="flex justify-between"><span className="text-stone-500">Mobile</span><span className="text-stone-800 dark:text-stone-200">{donation.mobile}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Amount</span><span className="font-semibold text-stone-900 dark:text-white">{formatInr(donation.amount)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">UPI Txn ID</span><span className="text-stone-800 dark:text-stone-200">{donation.upiTxnId || '—'}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Submitted</span><span className="text-stone-800 dark:text-stone-200">{formatDateTime(donation.createdAt)}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Status</span><DonationBadge status={donation.status} /></div>
        </div>

        {/* Screenshot */}
        <div className="mb-4 flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-stone-300 bg-stone-50 p-2 dark:border-neutral-700 dark:bg-neutral-800">
          {imgLoading ? (
            <span className="text-sm text-stone-400">Loading screenshot…</span>
          ) : imgUrl ? (
            <a href={imgUrl} target="_blank" rel="noreferrer">
              <img src={imgUrl} alt="Payment screenshot" className="max-h-72 rounded-lg" />
            </a>
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm text-stone-400">
              <ImageOff size={22} /> No screenshot uploaded
            </span>
          )}
        </div>

        <label className="mb-4 block text-sm font-medium text-stone-700 dark:text-stone-200">
          Admin remarks
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            rows={2}
            placeholder="Optional note…"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          />
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="danger-soft" leftIcon={Ban} isDisabled={busy} isPending={busy && acting === 'rejected'} onPress={() => decide('rejected')}>
            Reject
          </Button>
          <Button variant="secondary" leftIcon={Check} isDisabled={busy} isPending={busy && acting === 'verified'} onPress={() => decide('verified')}>
            Verify
          </Button>
          <Button leftIcon={BadgeCheck} isDisabled={busy} isPending={busy && acting === 'completed'} onPress={() => decide('completed')}>
            Mark completed
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ── Duplicate-reference panel ────────────────────────────────────────────── */

function DuplicatesPanel({ onClose }: { onClose: () => void }) {
  const [rows, setRows] = useState<DuplicateTxn[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    missionAdminService
      .duplicateDonations()
      .then(r => active && setRows(r))
      .catch(e => active && setError(e instanceof Error ? e.message : 'Failed to load.'))
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800 dark:text-red-200">
          <CopyX size={16} /> Re-used UPI references
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
          aria-label="Hide duplicates"
        >
          <X size={16} />
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!rows && !error && <p className="text-sm text-stone-500">Checking…</p>}
      {rows && rows.length === 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-300">
          No transaction id is claimed by more than one donation. 🎉
        </p>
      )}
      {rows && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map(d => (
            <li
              key={d.txnId}
              className="rounded-xl border border-red-200/70 bg-white px-3 py-2 text-sm dark:border-red-900/40 dark:bg-neutral-900"
            >
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs dark:bg-white/10">
                  {d.txnId}
                </code>
                <Badge tone="danger">{d.uses} donations</Badge>
              </div>
              <div className="mt-1 text-xs text-stone-500">
                {d.devotees.map((name, i) => (
                  <span key={i}>
                    {i > 0 && ' · '}
                    {name} ({d.statuses[i]})
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export function PaymentsPage() {
  const {
    donations,
    total,
    counts,
    loading,
    error,
    busyId,
    bulkBusy,
    filter,
    setFilter,
    query,
    setQuery,
    range,
    setRange,
    sortKey,
    sortDir,
    toggleSort,
    page,
    setPage,
    pageCount,
    from,
    to,
    params,
    refresh,
    update,
    bulkUpdate,
  } = useDonations()

  const toast = useToast()
  const [review, setReview] = useState<Donation | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showDuplicates, setShowDuplicates] = useState(false)
  const [openDevoteeId, setOpenDevoteeId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const pageIds = donations.map(d => d.id)
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })

  const onDecision = async (status: DonationStatus, remarks: string) => {
    if (!review) return
    try {
      await update(review.id, status, remarks)
      toast.success(`Donation marked ${status}.`)
      setReview(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed.')
    }
  }

  const doBulk = async (status: DonationStatus) => {
    const ids = [...selected]
    if (ids.length === 0) return
    // Verifying a flagged row in bulk is exactly the mistake this page exists to
    // prevent, so those have to be opened individually.
    const flagged = donations.filter(d => selected.has(d.id) && (d.dupTxn || d.amountMismatch))
    if (flagged.length > 0 && status !== 'rejected') {
      toast.error(
        `${flagged.length} selected donation(s) are flagged — review those one by one.`,
      )
      return
    }
    try {
      const n = await bulkUpdate(ids, status, 'Bulk action')
      toast.success(`Marked ${n} donation(s) ${status}.`)
      setSelected(new Set())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk action failed.')
    }
  }

  const openDevotee = async (userId: string) => {
    try {
      const id = await missionAdminService.devoteeIdForUser(userId)
      if (!id) {
        toast.error('No devotee profile is linked to this payment.')
        return
      }
      setReview(null)
      setOpenDevoteeId(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the devotee.')
    }
  }

  const doExport = async () => {
    setExporting(true)
    try {
      const { rows } = await missionAdminService.listDonationsPage({
        query: params.query,
        status: filter,
        from: params.from,
        to: params.to,
        sortKey,
        sortDir,
        page: 1,
        pageSize: 10000,
      })
      exportCsv('donations', rows, [
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
      toast.success(`Exported ${rows.length} donation(s).`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const chipCount = (key: DonationFilter) => counts[key as keyof typeof counts] ?? 0

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <HandCoins size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">
              Payment Verification
            </div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : `${formatNumber(counts.all)} donations · ${counts.pending} pending · ${describeRange(range)}`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {counts.flagged > 0 && (
            <Button
              variant="danger-soft"
              leftIcon={CopyX}
              onPress={() => setShowDuplicates(v => !v)}
            >
              {counts.flagged} flagged
            </Button>
          )}
          <Button variant="secondary" leftIcon={Download} isPending={exporting} onPress={doExport}>
            Export
          </Button>
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {showDuplicates && <DuplicatesPanel onClose={() => setShowDuplicates(false)} />}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            label="Search"
            icon={Search}
            placeholder="Name, mobile or txn id"
            value={query}
            onChange={setQuery}
          />
        </div>
        <div className="flex flex-wrap gap-1 pb-0.5">
          {FILTERS.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                filter === f.key
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200'
                  : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-xs text-stone-400">{chipCount(f.key)}</span>
            </button>
          ))}
        </div>
      </div>

      <DateRangePicker
        value={range}
        onChange={setRange}
        label="donations"
        className="mb-4"
      />

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-900/50 dark:bg-brand-950/30">
          <span className="font-medium text-brand-800 dark:text-brand-200">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            leftIcon={Check}
            isPending={bulkBusy}
            onPress={() => doBulk('verified')}
          >
            Verify all
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={BadgeCheck}
            isPending={bulkBusy}
            onPress={() => doBulk('completed')}
          >
            Mark completed
          </Button>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={Ban}
            isPending={bulkBusy}
            onPress={() => doBulk('rejected')}
          >
            Reject all
          </Button>
          <Button size="sm" variant="ghost" leftIcon={X} onPress={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-stone-400">Loading donations…</div>
      ) : donations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center text-stone-400 dark:border-neutral-700">
          No donations match these filters.
        </div>
      ) : (
        <>
          <div className="max-h-[60vh] overflow-auto rounded-2xl border border-stone-200 dark:border-neutral-800">
            <table className="w-full min-w-[860px] text-left text-sm">
              <SortableHeader
                columns={COLUMNS}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                leading={
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all on this page"
                    />
                  </th>
                }
              >
                <th className="px-4 py-3 font-semibold">Txn ID</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </SortableHeader>
              <tbody>
                {donations.map(d => (
                  <tr
                    key={d.id}
                    className={`border-t border-stone-100 transition-colors hover:bg-stone-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50 ${
                      d.dupTxn ? 'bg-red-50/50 dark:bg-red-950/10' : ''
                    } ${selected.has(d.id) ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-brand-600"
                        checked={selected.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        aria-label={`Select donation from ${d.fullName}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDevotee(d.userId)}
                        className="text-left font-medium text-stone-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-300"
                      >
                        {d.fullName}
                      </button>
                      <div className="text-xs text-stone-400">{d.mobile}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900 dark:text-white">
                      {formatInr(d.amount)}
                      {d.amountMismatch && (
                        <div className="text-[11px] font-normal text-amber-600 dark:text-amber-400">
                          expected {formatInr(d.expectedAmount)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <DonationBadge status={d.status} />
                        {d.dupTxn && (
                          <Badge tone="danger">
                            <CopyX size={11} /> duplicate
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                      {d.upiTxnId || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        isPending={busyId === d.id}
                        onPress={() => setReview(d)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageCount={pageCount}
            from={from}
            to={to}
            total={total}
            onPage={setPage}
            label="donations"
          />
        </>
      )}

      {review && (
        <ReviewDialog
          donation={review}
          busy={busyId === review.id}
          onClose={() => setReview(null)}
          onDecision={onDecision}
          onOpenDevotee={() => openDevotee(review.userId)}
        />
      )}

      <DevoteeDrawer
        devoteeId={openDevoteeId}
        onClose={() => setOpenDevoteeId(null)}
        onChanged={refresh}
      />
    </div>
  )
}
