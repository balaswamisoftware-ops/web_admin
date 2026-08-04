import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pageCount: number
  from: number
  to: number
  total: number
  onPage: (page: number) => void
  /** Noun for the counter, e.g. "devotees". */
  label?: string
}

/** A compact "1–20 of 240" pager with prev/next + numbered pages. */
export function Pagination({
  page,
  pageCount,
  from,
  to,
  total,
  onPage,
  label = 'items',
}: PaginationProps) {
  if (total === 0) return null

  // Windowed page numbers: first, last, and a few around the current page.
  const pages: (number | '…')[] = []
  const push = (n: number | '…') => pages.push(n)
  const window = 1
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || (p >= page - window && p <= page + window)) {
      push(p)
    } else if (pages[pages.length - 1] !== '…') {
      push('…')
    }
  }

  const btn =
    'flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors disabled:opacity-40'
  const idle =
    'border-stone-200 text-stone-600 hover:bg-stone-100 dark:border-white/10 dark:text-stone-300 dark:hover:bg-white/10'

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-stone-500">
        Showing <span className="font-medium text-stone-700 dark:text-stone-200">{from}–{to}</span>{' '}
        of <span className="font-medium text-stone-700 dark:text-stone-200">{total}</span> {label}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <button
            className={`${btn} ${idle}`}
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          {pages.map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-stone-400">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} ${
                  p === page
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : idle
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            className={`${btn} ${idle}`}
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
