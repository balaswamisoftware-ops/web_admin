import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  /** Tailwind classes for the icon chip, e.g. "bg-orange-100 text-orange-700". */
  tint: string
  hint?: string
}

/** A single dashboard metric tile with a soft hover lift and watermark icon. */
export function StatCard({ icon: Icon, label, value, tint, hint }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm shadow-stone-900/[0.03] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/10 dark:border-white/10 dark:bg-neutral-900/70">
      {/* Watermark icon */}
      <Icon
        size={92}
        strokeWidth={1.25}
        className="pointer-events-none absolute -right-4 -top-4 text-stone-900/[0.03] transition-transform duration-500 group-hover:scale-110 dark:text-white/[0.04]"
        aria-hidden
      />

      <div
        className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${tint} ring-1 ring-inset ring-black/5`}
      >
        <Icon size={20} />
      </div>
      <div className="text-[26px] font-bold leading-tight tracking-tight text-stone-900 dark:text-white">
        {value}
      </div>
      <div className="mt-0.5 text-sm font-medium text-stone-500">{label}</div>
      {hint && (
        <div className="mt-2 inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-white/5 dark:text-stone-400">
          {hint}
        </div>
      )}
    </div>
  )
}
