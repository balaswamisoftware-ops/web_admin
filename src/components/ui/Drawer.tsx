import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useModalA11y } from '../../hooks/useModalA11y'

interface DrawerProps {
  open: boolean
  title: string
  subtitle?: string
  icon?: LucideIcon
  /** Rendered at the bottom, pinned below the scrolling body. */
  footer?: ReactNode
  onClose: () => void
  children: ReactNode
}

/**
 * Right-hand slide-over panel. Same accessibility contract as the modals
 * (Escape to close, focus trap, scroll lock) but sized for detail views that
 * are read alongside the table behind them.
 */
export function Drawer({
  open,
  title,
  subtitle,
  icon: Icon,
  footer,
  onClose,
  children,
}: DrawerProps) {
  const ref = useModalA11y(open, onClose)
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-full w-full max-w-xl animate-[drawer-in_180ms_ease-out] flex-col border-l border-stone-200/70 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-stone-100 px-5 py-4 dark:border-white/10">
          {Icon && (
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
              <Icon size={19} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-stone-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="truncate text-sm text-stone-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-white/10"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-stone-100 px-5 py-3 dark:border-white/10">
            {footer}
          </footer>
        )}
      </div>

      <style>{`@keyframes drawer-in { from { transform: translateX(24px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>
    </div>
  )
}
