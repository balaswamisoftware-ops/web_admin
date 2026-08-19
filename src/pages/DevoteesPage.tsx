import { useCallback, useState } from 'react'
import { Search, RefreshCw, Users, UserPlus, Ban, CircleCheck, Download, X } from 'lucide-react'
import type { Devotee } from '../types/devotee'
import { useDevotees, type DevoteeStatusFilter } from '../hooks/useDevotees'
import { devoteesService } from '../services/devoteesService'
import { Input, Button, Pagination, DateRangePicker, useToast } from '../components/ui'
import { DevoteesTable } from '../components/devotees/DevoteesTable'
import { DevoteeDrawer } from '../components/devotees/DevoteeDrawer'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'
import { exportCsv } from '../lib/exportCsv'
import { formatMobile, formatDate, formatNumber } from '../lib/format'
import { describeRange } from '../lib/dateRange'
import {
  DevoteeFormDialog,
  type DevoteeFormValues,
} from '../components/devotees/DevoteeFormDialog'

const selCls =
  'h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

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
    status,
    setStatus,
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
    create,
    update,
    remove,
    setBlocked,
  } = useDevotees()

  const toast = useToast()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [target, setTarget] = useState<Devotee | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Devotee | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  // Selection helpers. Only rows on the current page can be selected — the rest
  // of the filtered set now lives on the server.
  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const pageIds = devotees.map(d => d.id)
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
  const openEdit = useCallback((devotee: Devotee) => {
    setEditing(devotee)
    setFormOpen(true)
  }, [])

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
      setOpenId(id => (id === target.id ? null : id))
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
    const targets = devotees.filter(d => selected.has(d.id) && d.isBlocked !== blocked)
    if (targets.length === 0) {
      toast.info(`Nothing to ${blocked ? 'block' : 'unblock'} in the selection.`)
      return
    }
    try {
      // Sequential: each call is an audited RPC, and a burst of parallel writes
      // to the same table just queues up server-side anyway.
      for (const d of targets) await setBlocked(d.id, blocked)
      toast.success(`${blocked ? 'Blocked' : 'Unblocked'} ${targets.length} devotee(s).`)
      clearSelection()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bulk action failed.')
    }
  }

  /**
   * Export honours the CURRENT filters, not just the visible page — the whole
   * point of exporting is to get the rows you filtered down to.
   */
  const doExport = async () => {
    setExporting(true)
    try {
      const rows =
        selected.size > 0
          ? devotees.filter(d => selected.has(d.id))
          : (
              await devoteesService.page({
                query,
                nakshatram,
                status,
                from: params.from,
                to: params.to,
                sortKey,
                sortDir,
                page: 1,
                pageSize: 10000,
              })
            ).rows

      exportCsv('devotees', rows, [
        { header: 'Name', value: d => d.fullName },
        { header: 'Mobile', value: d => formatMobile(d.mobile) },
        { header: 'Chants', value: d => d.chantCount ?? 0 },
        { header: 'Nakshatram', value: d => d.nakshatram },
        { header: 'Gothram', value: d => d.gothram },
        { header: 'Seva', value: d => d.donationStatus ?? 'none' },
        { header: 'Registered', value: d => formatDate(d.createdAt) },
        { header: 'Blocked', value: d => (d.isBlocked ? 'Yes' : 'No') },
      ])
      toast.success(`Exported ${rows.length} devotee(s).`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 text-left sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Users size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">Devotees</div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : `${formatNumber(total)} matching · ${describeRange(range)}`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={Download}
            isPending={exporting}
            onPress={doExport}
          >
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
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Search"
            icon={Search}
            placeholder="Name, mobile, gothram or nakshatram"
            value={query}
            onChange={setQuery}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
          Nakshatram
          <select
            value={nakshatram}
            onChange={e => setNakshatram(e.target.value)}
            className={selCls}
          >
            {nakshatramOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
          Status
          <select
            value={status}
            onChange={e => setStatus(e.target.value as DevoteeStatusFilter)}
            className={selCls}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
      </div>

      <DateRangePicker
        value={range}
        onChange={setRange}
        label="registrations"
        className="mb-4"
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm dark:border-brand-900/50 dark:bg-brand-950/30">
          <span className="font-medium text-brand-800 dark:text-brand-200">
            {selected.size} selected on this page
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" leftIcon={Ban} onPress={() => bulkBlock(true)}>
            Block
          </Button>
          <Button size="sm" variant="ghost" leftIcon={CircleCheck} onPress={() => bulkBlock(false)}>
            Unblock
          </Button>
          <Button size="sm" variant="ghost" leftIcon={Download} onPress={doExport}>
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
        <div className="flex items-center justify-center py-20 text-stone-400">
          Loading devotees…
        </div>
      ) : (
        <>
          <DevoteesTable
            devotees={devotees}
            deletingId={deletingId}
            onEdit={openEdit}
            onDelete={setTarget}
            onToggleBlock={toggleBlock}
            onOpen={d => setOpenId(d.id)}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
            selected={selected}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            allSelected={allSelected}
          />
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

      <DevoteeDrawer
        devoteeId={openId}
        onClose={() => setOpenId(null)}
        onEdit={devotee => {
          setOpenId(null)
          openEdit(devotee)
        }}
        onChanged={refresh}
      />

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
