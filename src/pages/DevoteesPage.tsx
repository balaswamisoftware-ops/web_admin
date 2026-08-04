import { useMemo, useState } from 'react'
import { Search, RefreshCw, Users, UserPlus, Ban, CircleCheck, Download, X } from 'lucide-react'
import type { Devotee } from '../types/devotee'
import { useDevotees } from '../hooks/useDevotees'
import { useTableControls } from '../hooks/useTableControls'
import { Input, Button, Pagination, useToast } from '../components/ui'
import { DevoteesTable } from '../components/devotees/DevoteesTable'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'
import { exportCsv } from '../lib/exportCsv'
import { formatMobile, formatDate } from '../lib/format'
import {
  DevoteeFormDialog,
  type DevoteeFormValues,
} from '../components/devotees/DevoteeFormDialog'

type StatusFilter = 'all' | 'active' | 'blocked'

const sortAccessors: Record<string, (d: Devotee) => string | number> = {
  name: d => d.fullName.toLowerCase(),
  mobile: d => d.mobile,
  nakshatram: d => d.nakshatram.toLowerCase(),
  gothram: d => d.gothram.toLowerCase(),
  registered: d => new Date(d.createdAt).getTime(),
}

export function DevoteesPage() {
  const {
    devotees,
    total,
    loading,
    error,
    deletingId,
    query,
    setQuery,
    nakshatram,
    setNakshatram,
    nakshatramOptions,
    refresh,
    create,
    update,
    remove,
    setBlocked,
  } = useDevotees()

  const toast = useToast()
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<Devotee | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Devotee | null>(null)

  // Blocked/active filter runs on top of the hook's search + nakshatram filter.
  const statusFiltered = useMemo(() => {
    if (status === 'active') return devotees.filter(d => !d.isBlocked)
    if (status === 'blocked') return devotees.filter(d => d.isBlocked)
    return devotees
  }, [devotees, status])

  const table = useTableControls(statusFiltered, {
    sortAccessors,
    initialSortKey: 'registered',
    initialSortDir: 'desc',
    pageSize: 20,
  })

  // Selection helpers.
  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const pageIds = table.pageRows.map(d => d.id)
  const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))
  const toggleAll = () =>
    setSelected(prev => {
      const next = new Set(prev)
      if (allSelected) pageIds.forEach(id => next.delete(id))
      else pageIds.forEach(id => next.add(id))
      return next
    })
  const clearSelection = () => setSelected(new Set())

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (devotee: Devotee) => {
    setEditing(devotee)
    setFormOpen(true)
  }

  const submitForm = async (values: DevoteeFormValues) => {
    let result: string | null
    if (editing) {
      const { password, ...rest } = values
      result = await update(editing.id, { ...rest, ...(password ? { password } : {}) })
    } else {
      result = await create(values)
    }
    if (!result) toast.success(editing ? 'Devotee updated.' : 'Devotee added.')
    return result
  }

  const confirmDelete = async () => {
    if (!target) return
    try {
      await remove(target.id)
      toast.success(`Removed ${target.fullName}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed.')
    } finally {
      setTarget(null)
    }
  }

  const toggleBlock = async (d: Devotee) => {
    try {
      await setBlocked(d.id, !d.isBlocked)
      toast.success(`${d.isBlocked ? 'Unblocked' : 'Blocked'} ${d.fullName}.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed.')
    }
  }

  const bulkBlock = async (blocked: boolean) => {
    const ids = [...selected]
    try {
      await Promise.all(
        ids
          .map(id => devotees.find(d => d.id === id))
          .filter((d): d is Devotee => !!d && d.isBlocked !== blocked)
          .map(d => setBlocked(d.id, blocked)),
      )
      toast.success(`${blocked ? 'Blocked' : 'Unblocked'} ${ids.length} devotee(s).`)
      clearSelection()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk action failed.')
    }
  }

  const exportSelected = () => {
    const rows =
      selected.size > 0
        ? statusFiltered.filter(d => selected.has(d.id))
        : statusFiltered
    exportCsv('devotees', rows, [
      { header: 'Name', value: d => d.fullName },
      { header: 'Mobile', value: d => formatMobile(d.mobile) },
      { header: 'Nakshatram', value: d => d.nakshatram },
      { header: 'Gothram', value: d => d.gothram },
      { header: 'Registered', value: d => formatDate(d.createdAt) },
      { header: 'Blocked', value: d => (d.isBlocked ? 'Yes' : 'No') },
    ])
    toast.success(`Exported ${rows.length} devotee(s).`)
  }

  const selCls =
    'h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 text-left sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Users size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">Devotees</div>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${total} registered · ${table.total} shown`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={Download} onPress={exportSelected}>
            Export
          </Button>
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
            Refresh
          </Button>
          <Button leftIcon={UserPlus} onPress={openCreate}>
            Add devotee
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Search"
            icon={Search}
            placeholder="Name, mobile or gothram"
            value={query}
            onChange={setQuery}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
          Nakshatram
          <select value={nakshatram} onChange={e => setNakshatram(e.target.value)} className={selCls}>
            {nakshatramOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
          Status
          <select
            value={status}
            onChange={e => setStatus(e.target.value as StatusFilter)}
            className={selCls}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-900/50 dark:bg-brand-950/30">
          <span className="font-medium text-brand-800 dark:text-brand-200">
            {selected.size} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" leftIcon={Ban} onPress={() => bulkBlock(true)}>
            Block
          </Button>
          <Button size="sm" variant="ghost" leftIcon={CircleCheck} onPress={() => bulkBlock(false)}>
            Unblock
          </Button>
          <Button size="sm" variant="ghost" leftIcon={Download} onPress={exportSelected}>
            Export
          </Button>
          <Button size="sm" variant="ghost" leftIcon={X} onPress={clearSelection}>
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
        <div className="flex items-center justify-center py-20 text-gray-400">
          Loading devotees…
        </div>
      ) : (
        <>
          <DevoteesTable
            devotees={table.pageRows}
            deletingId={deletingId}
            onEdit={openEdit}
            onDelete={setTarget}
            onToggleBlock={toggleBlock}
            sortKey={table.sortKey}
            sortDir={table.sortDir}
            onSort={table.toggleSort}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            allSelected={allSelected}
          />
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

      <DevoteeFormDialog
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        devotee={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={submitForm}
      />

      <ConfirmDialog
        open={target !== null}
        title="Delete devotee?"
        message={`This will permanently remove ${target?.fullName ?? ''} from the devotees list.`}
        confirmLabel="Delete"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  )
}
