import { useState } from 'react'
import {
  History,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Undo2,
  ShieldCheck,
} from 'lucide-react'
import { useAuditLogs } from '../hooks/useAuditLogs'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'
import type { AuditLog } from '../types/audit'

/** ISO -> "2 Jun 2026, 4:05 PM". */
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Colour per action family, for the badge.
function actionTint(action: string): string {
  if (action.endsWith('.revert')) return 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300'
  if (action.startsWith('chant')) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
  if (action.startsWith('donation')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
  if (action.startsWith('settings')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
  if (action.startsWith('devotee')) return 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
  if (action.startsWith('admin')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
  return 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300'
}

export function AuditLogsPage() {
  const { logs, loading, error, refresh, revert, revertingId } = useAuditLogs()
  const [pending, setPending] = useState<AuditLog | null>(null)

  const confirmRevert = async () => {
    if (!pending) return
    try {
      await revert(pending.id)
    } catch {
      /* error surfaced via the hook's error state */
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700 dark:bg-neutral-800 dark:text-gray-300">
            <History size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              Audit log
            </div>
            <div className="text-sm text-gray-500">
              Every admin action, newest first — revert the reversible ones
            </div>
          </div>
        </div>
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

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading audit log…</div>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 py-16 text-center text-sm text-gray-400 dark:border-white/10">
          No admin actions recorded yet.
        </div>
      ) : (
        <ul className="space-y-2.5">
          {logs.map(log => (
            <li
              key={log.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-neutral-900 ${
                log.reverted
                  ? 'border-stone-200/70 opacity-70 dark:border-white/10'
                  : 'border-stone-200/70 dark:border-white/10'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${actionTint(
                        log.action,
                      )}`}
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
                  <p className="break-words text-sm font-medium text-gray-900 dark:text-white">
                    {log.summary || log.action}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {log.actorName}
                    </span>
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

                {/* Revert button — only for revertible, not-yet-reverted entries */}
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
