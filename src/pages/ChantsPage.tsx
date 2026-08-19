import { useState } from 'react'
import { Flame, Search, RefreshCw, Download, Pencil, X, Trophy } from 'lucide-react'
import type { ChantEntry } from '../types/mission'
import { useChants } from '../hooks/useChants'
import { useModalA11y } from '../hooks/useModalA11y'
import { missionAdminService } from '../services/missionAdminService'
import {
  Badge,
  Button,
  DateRangePicker,
  Input,
  Pagination,
  SortableHeader,
  useToast,
  type Column,
} from '../components/ui'
import { DevoteeDrawer } from '../components/devotees/DevoteeDrawer'
import { formatDate, formatNumber } from '../lib/format'
import { describeRange } from '../lib/dateRange'
import { exportCsv } from '../lib/exportCsv'

const COLUMNS: Column[] = [
  { key: 'devotee', label: 'Devotee' },
  { key: 'chants', label: 'Chants', numeric: true },
  { key: 'updated', label: 'Updated' },
]

function AdjustDialog({
  entry,
  busy,
  onClose,
  onSave,
}: {
  entry: ChantEntry
  busy: boolean
  onClose: () => void
  onSave: (count: number) => void
}) {
  const [value, setValue] = useState(String(entry.count))
  const [error, setError] = useState<string | null>(null)
  const ref = useModalA11y(true, onClose)

  const submit = () => {
    const n = parseInt(value, 10)
    if (!Number.isFinite(n) || n < 0) return setError('Enter a valid number (0 or more).')
    onSave(n)
  }

  const next = parseInt(value, 10)
  const delta = Number.isFinite(next) ? next - entry.count : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Adjust chant count"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Adjust chant count</h2>
          <button type="button" onClick={onClose} className="text-stone-400 hover:text-stone-600">
            <X size={20} />
          </button>
        </div>
        <p className="mb-4 text-sm text-stone-500">
          {entry.fullName} · {entry.mobile}
        </p>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="mb-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        {/* The devotee sees this delta in their own history, so make it explicit. */}
        <p className="mb-3 text-xs text-stone-500">
          Currently {formatNumber(entry.count)}.{' '}
          {delta === 0
            ? 'No change.'
            : `This logs a ${delta > 0 ? '+' : ''}${formatNumber(delta)} ${
                next === 0 ? 'reset' : 'adjustment'
              } in their history.`}
        </p>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setValue('0')}
            className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 dark:bg-neutral-800 dark:text-stone-300"
          >
            Reset to 0
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onPress={onClose} isDisabled={busy}>
            Cancel
          </Button>
          <Button onPress={submit} isPending={busy}>
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ChantsPage() {
  const {
    chants,
    total,
    loading,
    error,
    busyId,
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
    setCount,
  } = useChants()

  const toast = useToast()
  const [editing, setEditing] = useState<ChantEntry | null>(null)
  const [openDevoteeId, setOpenDevoteeId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const onSave = async (count: number) => {
    if (!editing) return
    try {
      await setCount(editing.userId, count)
      toast.success(`Set ${editing.fullName}'s count to ${formatNumber(count)}.`)
      setEditing(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update count.')
    }
  }

  const openDevotee = async (userId: string) => {
    try {
      const id = await missionAdminService.devoteeIdForUser(userId)
      if (!id) {
        toast.error('No devotee profile is linked to this chant record.')
        return
      }
      setOpenDevoteeId(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not open the devotee.')
    }
  }

  const doExport = async () => {
    setExporting(true)
    try {
      const { rows } = await missionAdminService.listChantsPage({
        query: params.query,
        from: params.from,
        to: params.to,
        sortKey,
        sortDir,
        page: 1,
        pageSize: 10000,
      })
      exportCsv('chant-report', rows, [
        { header: 'Rank', value: c => c.rank },
        { header: 'Devotee', value: c => c.fullName },
        { header: 'Mobile', value: c => c.mobile },
        { header: 'Chants', value: c => c.count },
        { header: 'Malas', value: c => Math.floor(c.count / 108) },
        { header: 'Last updated', value: c => formatDate(c.updatedAt) },
      ])
      toast.success(`Exported ${rows.length} record(s).`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <Flame size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">
              Chant Management
            </div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : `${formatNumber(total)} contributors · ${describeRange(range)}`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={Download} isPending={exporting} onPress={doExport}>
            Export
          </Button>
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-3 max-w-md">
        <Input
          label="Search"
          icon={Search}
          placeholder="Name or mobile"
          value={query}
          onChange={setQuery}
        />
      </div>

      <DateRangePicker
        value={range}
        onChange={setRange}
        label="chant activity"
        className="mb-4"
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-stone-400">Loading chants…</div>
      ) : chants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center text-stone-400 dark:border-neutral-700">
          No chant records match these filters.
        </div>
      ) : (
        <>
          <div className="max-h-[60vh] overflow-auto rounded-2xl border border-stone-200 dark:border-neutral-800">
            <table className="w-full min-w-[680px] text-left text-sm">
              <SortableHeader
                columns={COLUMNS}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                leading={<th className="w-16 px-4 py-3 font-semibold">Rank</th>}
              >
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </SortableHeader>
              <tbody>
                {chants.map(c => (
                  <tr
                    key={c.userId}
                    className="border-t border-stone-100 transition-colors hover:bg-stone-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      {c.rank <= 3 ? (
                        <Badge tone="warning">
                          <Trophy size={11} /> {c.rank}
                        </Badge>
                      ) : (
                        <span className="text-stone-400">#{c.rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => openDevotee(c.userId)}
                        className="text-left font-medium text-stone-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-300"
                      >
                        {c.fullName}
                      </button>
                      <div className="text-xs text-stone-400">{c.mobile}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stone-900 dark:text-white">
                      {formatNumber(c.count)}
                      <div className="text-[11px] font-normal text-stone-400">
                        {formatNumber(Math.floor(c.count / 108))} malas
                      </div>
                    </td>
                    <td className="px-4 py-3 text-stone-500">{formatDate(c.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={Pencil}
                        isPending={busyId === c.userId}
                        onPress={() => setEditing(c)}
                      >
                        Adjust
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
            label="devotees"
          />
        </>
      )}

      {editing && (
        <AdjustDialog
          entry={editing}
          busy={busyId === editing.userId}
          onClose={() => setEditing(null)}
          onSave={onSave}
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
