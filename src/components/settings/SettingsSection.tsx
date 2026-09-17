import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/** Text input styling shared by the settings-style admin pages. */
export const inputCls =
  'h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-stone-500'

/** A titled settings section with an icon chip and optional description. */
export function Section({
  icon: Icon,
  title,
  description,
  tint = 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  className = '',
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  tint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm shadow-stone-900/[0.03] backdrop-blur-sm sm:p-6 dark:border-white/10 dark:bg-neutral-900/70 ${className}`}
    >
      <div className="mb-5 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${tint}`}
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-stone-500 dark:text-stone-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </label>
  )
}

/** An accessible on/off switch. */
export function Toggle({
  checked,
  onChange,
  tone = 'brand',
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  tone?: 'brand' | 'green'
  disabled?: boolean
}) {
  const on =
    tone === 'green' ? 'bg-emerald-500' : 'bg-brand-500'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? on : 'bg-stone-300 dark:bg-neutral-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
