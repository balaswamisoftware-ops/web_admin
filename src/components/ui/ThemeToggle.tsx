import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import type { Theme } from '../../lib/theme'
import { cn } from './cn'

// Cycle order and per-mode icon/label.
const ORDER: Theme[] = ['light', 'dark', 'system']
const ICON = { light: Sun, dark: Moon, system: Monitor }
const LABEL: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
}

/**
 * A compact theme switcher that cycles Light → Dark → System on each click.
 * Shows the current mode's icon; hover reveals the current mode + what's next.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const Icon = ICON[theme]
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      title={`Theme: ${LABEL[theme]} — click for ${LABEL[next]}`}
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[next]}.`}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/70 bg-white/70 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white',
        className,
      )}
    >
      <Icon size={18} aria-hidden />
    </button>
  )
}
