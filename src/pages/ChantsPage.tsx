import { useState } from 'react'
import { Flame, Search, RefreshCw, Download, Pencil, X, ArrowUp, ArrowDown } from 'lucide-react'
import type { ChantEntry } from '../types/mission'
import { useChants } from '../hooks/useChants'
import { useTableControls } from '../hooks/useTableControls'
import { useModalA11y } from '../hooks/useModalA11y'
import { Input, Button, Pagination, useToast } from '../components/ui'
import { formatDate } from '../lib/format'
import { exportCsv } from '../lib/exportCsv'

const num = (n: number) => n.toLocaleString('en-IN')

const sortAccessors: Record<string, (c: ChantEntry) => string | number> = {
  devotee: c => c.fullName.toLowerCase(),
  chants: c => c.count,
  updated: c => new Date(c.updatedAt).getTime(),
}

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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Adjust chant count</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="mb-4 text-sm text-gray-500">{entry.fullName} · {entry.mobile}</p>
        {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
        <input
          type="number"
          min={0}
          value={value}
          onChange={e => setValue(e.target.value)}
          className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
        />
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setValue('0')} className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
            Reset to 0
          </button>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onPress={onClose} isDisabled={busy}>Cancel</Button>
          <Button onPress={submit} isPending={busy}>Save</Button>
        </div>
      </div>
    </div>
  )
}

export function ChantsPage() {
  const { chants, total, contributors, loading, error, busyId, query, setQuery, refresh, setCount } = useChants()
  const toast = useToast()
  const [editing, setEditing] = useState<ChantEntry | null>(null)

  const table = useTableControls(chants, {
    sortAccessors,
    initialSortKey: 'chants',
    initialSortDir: 'desc',
    pageSize: 15,
  })

  const onSave = async (count: number) => {
    if (!editing) return
    try {
      await setCount(editing.userId, count)
      toast.success(`Set ${editing.fullName}'s count to ${num(count)}.`)
      setEditing(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update count.')
    }
  }

  const doExport = () => {
    exportCsv('chant-report', chants, [
      { header: 'Devotee', value: c => c.fullName },
      { header: 'Mobile', value: c => c.mobile },
      { header: 'Chants', value: c => c.count },
      { header: 'Last updated', value: c => formatDate(c.updatedAt) },
    ])
    toast.success(`Exported ${chants.length} record(s).`)
  }

  const cols: { key: string; label: string }[] = [
    { key: 'devotee', label: 'Devotee' },
    { key: 'chants', label: 'Chants' },
    { key: 'updated', label: 'Updated' },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <Flame size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">Chant Management</div>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${num(total)} total chants · ${contributors} contributors`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={Download} onPress={doExport}>Export</Button>
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>Refresh</Button>
        </div>
      </div>

      <div className="mb-4 max-w-md">
        <Input label="Search" icon={Search} placeholder="Name or mobile" value={query} onChange={setQuery} />
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading chants…</div>
      ) : chants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 py-16 text-center text-gray-400 dark:border-neutral-700">
          No chant records yet.
        </div>
      ) : (
        <>
          <div className="max-h-[60vh] overflow-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 shadow-[0_1px_0_theme(colors.gray.200)] dark:bg-neutral-900 dark:shadow-[0_1px_0_theme(colors.neutral.800)]">
                  <th className="px-4 py-3 font-semibold">#</th>
                  {cols.map(col => {
                    const active = table.sortKey === col.key
                    return (
                      <th key={col.key} className={`px-4 py-3 font-semibold ${col.key === 'devotee' ? '' : ''}`}>
                        <button
                          type="button"
                          onClick={() => table.toggleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          {col.label}
                          {active && (table.sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                        </button>
                      </th>
                    )
                  })}
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {table.pageRows.map((c, i) => (
                  <tr key={c.userId} className="border-t border-gray-100 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50">
                    <td className="px-4 py-3 text-gray-400">{table.from + i}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{c.fullName}</div>
                      <div className="text-xs text-gray-400">{c.mobile}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{num(c.count)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.updatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" leftIcon={Pencil} isPending={busyId === c.userId} onPress={() => setEditing(c)}>
                        Adjust
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={table.page}
            pageCount={table.pageCount}
            from={table.from}
            to={table.to}
            total={table.total}
            onPage={table.setPage}
            label="devotees"
          />
        </>
      )}

      {editing && (
        <AdjustDialog entry={editing} busy={busyId === editing.userId} onClose={() => setEditing(null)} onSave={onSave} />
      )}
    </div>
  )
}
