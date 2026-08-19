import type { ReactNode } from 'react'
import { cn } from './cn'

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-600 dark:bg-white/10 dark:text-stone-300',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  success:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
}

/** Small pill used for statuses, flags and counts across the tables. */
export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const DONATION_TONES: Record<string, BadgeTone> = {
  pending: 'warning',
  verified: 'success',
  completed: 'success',
  rejected: 'danger',
}

/** Donation status pill — the one place that mapping lives. */
export function DonationBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge tone="neutral">No donation</Badge>
  return (
    <Badge tone={DONATION_TONES[status] ?? 'neutral'} className="capitalize">
      {status}
    </Badge>
  )
}
