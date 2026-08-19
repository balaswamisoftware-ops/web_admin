import { useState } from 'react'
import {
  History,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Undo2,
  ShieldCheck,
  Search,
  Download,
  UserCog,
} from 'lucide-react'
import { useAuditLogs, AUDIT_FAMILIES, type AuditFamily } from '../hooks/useAuditLogs'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'
import { Input, Pagination, DateRangePicker, useToast } from '../components/ui'
import { formatDateTime } from '../lib/format'
import { describeRange } from '../lib/dateRange'
import { exportCsv } from '../lib/exportCsv'
import type { AuditLog } from '../types/audit'

function actionTint(action: string): string {
  if (action.endsWith('.revert')) return 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300'
  if (action.startsWith('chant')) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  if (action.startsWith('donation')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (action.startsWith('settings')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  if (action.startsWith('devotee')) return 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
  if (action.startsWith('notification')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
  if (action.startsWith('admin')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
  return 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300'
}

const selCls =
  'h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

export function AuditLogsPage() {
  const {
    logs,
    total,
    loading,
    error,
    query,
    setQuery,
    family,
    setFamily,
    actor,
    setActor,
    actors,
    range,
    setRange,
    page,
    setPage,
    pageCount,
    from,
    to,
    refresh,
    revert,
    revertingId,
    exportRows,
  } = useAuditLogs()

  const toast = useToast()
  const [pending, setPending] = useState<AuditLog | null>(null)
  const [exporting, setExporting] = useState(false)

  const confirmRevert = async () => {
    if (!pending) return
    try {
      await revert(pending.id)
      toast.success('Action reverted.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Revert failed.')
    } finally {
      setPending(null)
    }
  }

  const doExport = async () => {
    setExporting(true)
    try {
      const rows = await exportRows()
      exportCsv('audit-log', rows, [
        { header: 'When', value: l => formatDateTime(l.createdAt) },
        { header: 'Admin', value: l => l.actorName },
        { header: 'Email', value: l => l.actorEmail },
        { header: 'Action', value: l => l.action },
        { header: 'Entity', value: l => l.entityType },
        { header: 'Entity id', value: l => l.entityId ?? '' },
        { header: 'Summary', value: l => l.summary },
        { header: 'Revertible', value: l => (l.revertible ? 'Yes' : 'No') },
        { header: 'Reverted', value: l => (l.reverted ? 'Yes' : 'No') },
        { header: 'Reverted by', value: l => l.revertedByName ?? '' },
      ])
      toast.success(`Exported ${rows.length} entry(s).`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-neutral-800 dark:text-stone-300">
            <History size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">Audit log</div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : `${total} entr${total === 1 ? 'y' : 'ies'} · ${describeRange(range)}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={doExport}
            disabled={exporting || total === 0}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-stone-200/70 px-3 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-40 dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/10"
          >
            <Download size={15} />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button
            type="button"
            onClick={refresh}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200/70 text-stone-500 transition-colors hover:bg-stone-100 dark:border-white/10 dark:hover:bg-white/10"
            title="Refresh"
            aria-label="Refresh audit log"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <Input
            label="Search"
            icon={Search}
            placeholder="Action, admin or summary"
            value={query}
            onChange={setQuery}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
          Type
          <select
            value={family}
            onChange={e => setFamily(e.target.value as AuditFamily)}
            className={selCls}
          >
            {AUDIT_FAMILIES.map(f => (
              <option key={f} value={f}>
                {f === 'all' ? 'All actions' : f.charAt(0).toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-700 dark:text-stone-200">
          <span className="flex items-center gap-1.5">
            <UserCog size={14} /> Admin
          </span>
          <select
            value={actor}
            onChange={e => setActor(e.target.value)}
            className={selCls}
          >
            <option value="">All admins</option>
            {actors.map(a => (
              <option key={a.name} value={a.name}>
                {a.name} ({a.entries})
              </option>
            ))}
          </select>
        </label>
      </div>

      <DateRangePicker value={range} onChange={setRange} label="entries" className="mb-4" />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-stone-400">Loading audit log…</div>
      ) : total === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 py-16 text-center text-sm text-stone-400 dark:border-white/10">
          No matching admin actions.
        </div>
      ) : (
        <>
          <ul className="max-h-[60vh] space-y-2.5 overflow-y-auto pr-1">
            {logs.map(log => (
              <li
                key={log.id}
                className={`rounded-2xl border border-stone-200/70 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 ${
                  log.reverted ? 'opacity-70' : ''
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${actionTint(log.action)}`}
                      >
                        {log.action}
                      </span>
                      {log.revertOf && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-white/10 dark:text-stone-300">
                          <Undo2 size={11} /> revert
                        </span>
                      )}
                      {log.reverted && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          reverted
                        </span>
                      )}
                    </div>
                    <p className="break-words text-sm font-medium text-stone-900 dark:text-white">
                      {log.summary || log.action}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      <button
                        type="button"
                        onClick={() => setActor(log.actorName)}
                        className="font-medium text-stone-600 hover:underline dark:text-stone-300"
                        title={`Show only ${log.actorName}'s actions`}
                      >
                        {log.actorName}
                      </button>
                      {log.actorEmail ? ` · ${log.actorEmail}` : ''} ·{' '}
                      {formatDateTime(log.createdAt)}
                    </p>
                    {log.reverted && log.revertedByName && (
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        Reverted by {log.revertedByName}
                        {log.revertedAt ? ` · ${formatDateTime(log.revertedAt)}` : ''}
                      </p>
                    )}
                  </div>

                  {log.revertible && !log.reverted && (
                    <button
                      type="button"
                      onClick={() => setPending(log)}
                      disabled={revertingId === log.id}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-white/10 dark:text-stone-300 dark:hover:bg-red-950/30"
                    >
                      <RotateCcw size={13} />
                      {revertingId === log.id ? 'Reverting…' : 'Revert'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            pageCount={pageCount}
            from={from}
            to={to}
            total={total}
            onPage={setPage}
            label="entries"
          />
        </>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
        <ShieldCheck size={13} /> Only super admins can view and revert the audit log.
      </p>

      <ConfirmDialog
        open={pending !== null}
        title="Revert this action?"
        message={
          pending
            ? `This will undo "${pending.summary || pending.action}" and restore the previous state. A revert entry will be recorded.`
            : ''
        }
        confirmLabel="Revert"
        loading={revertingId !== null}
        onConfirm={confirmRevert}
        onCancel={() => setPending(null)}
      />
    </div>
  )
}
