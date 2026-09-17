import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertCircle, Search, X } from 'lucide-react'
import type { DevoteeCandidate } from '../../types/devoteeAdmin'
import { devoteeAdminsService } from '../../services/devoteeAdminsService'
import { useModalA11y } from '../../hooks/useModalA11y'
import { formatMobile } from '../../lib/format'
import { Button } from '../ui'

/** What the dialog should do with a given search result. */
export interface CandidateVerdict {
  /** Button label when the devotee can be picked. */
  actionLabel: string
  /** Set when they can't — shown instead of the button, so nobody is silently hidden. */
  blockedReason?: string
  /** Extra context shown under the name, e.g. "Currently in Ravi's group". */
  note?: string
}

/**
 * Search devotees by name or mobile and pick one. Used for appointing a Devotee
 * Admin and for adding a devotee to a group; the caller decides, per result,
 * whether it can be picked and why not. Mount it only while open, so each
 * opening starts with a clean search.
 */
export function DevoteeSearchDialog({
  title,
  description,
  icon: Icon,
  evaluate,
  onPick,
  onClose,
}: {
  title: string
  description: string
  icon: LucideIcon
  evaluate: (c: DevoteeCandidate) => CandidateVerdict
  /** Resolve null on success, or an error message to show. */
  onPick: (c: DevoteeCandidate) => Promise<string | null>
  onClose: () => void
}) {
  const ref = useModalA11y(true, onClose)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DevoteeCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickingId, setPickingId] = useState<string | null>(null)

  const trimmed = query.trim()

  // Debounced search. State is only set from the timer / promise callbacks.
  useEffect(() => {
    if (trimmed.length < 2) return
    let alive = true
    const timer = setTimeout(() => {
      devoteeAdminsService
        .candidates(trimmed)
        .then(rows => alive && (setResults(rows), setError(null)))
        .catch(e => alive && setError(e instanceof Error ? e.message : 'Search failed.'))
        .finally(() => alive && setSearching(false))
    }, 300)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [trimmed])

  const onQuery = (value: string) => {
    setQuery(value)
    const ready = value.trim().length >= 2
    setSearching(ready)
    if (!ready) setResults([])
  }

  const pick = async (c: DevoteeCandidate) => {
    setPickingId(c.devoteeId)
    setError(null)
    const problem = await onPick(c)
    setPickingId(null)
    if (problem) setError(problem)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-stone-200/70 p-5 dark:border-white/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            <Icon size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-stone-900 dark:text-white">{title}</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 pb-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              autoFocus
              value={query}
              onChange={e => onQuery(e.target.value)}
              placeholder="Search by name or mobile"
              aria-label="Search devotees"
              className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
              <AlertCircle size={15} className="mt-px shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="min-h-[8rem] flex-1 overflow-y-auto px-5 pb-5">
          {trimmed.length < 2 ? (
            <p className="py-8 text-center text-sm text-stone-400">
              Type at least 2 letters of a name, or part of a mobile number.
            </p>
          ) : searching ? (
            <p className="py-8 text-center text-sm text-stone-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="py-8 text-center text-sm text-stone-400">No devotee matches “{trimmed}”.</p>
          ) : (
            <ul className="space-y-2">
              {results.map(c => {
                const verdict = evaluate(c)
                return (
                  <li
                    key={c.devoteeId}
                    className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-white/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                      {c.fullName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-stone-900 dark:text-white">
                        {c.fullName}
                      </div>
                      <div className="text-xs text-stone-500">{formatMobile(c.mobile)}</div>
                      {(verdict.blockedReason || verdict.note) && (
                        <div
                          className={`mt-0.5 text-xs ${
                            verdict.blockedReason
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-stone-400'
                          }`}
                        >
                          {verdict.blockedReason ?? verdict.note}
                        </div>
                      )}
                    </div>
                    {!verdict.blockedReason && (
                      <Button
                        size="sm"
                        isPending={pickingId === c.devoteeId}
                        isDisabled={pickingId !== null && pickingId !== c.devoteeId}
                        onPress={() => pick(c)}
                      >
                        {verdict.actionLabel}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
