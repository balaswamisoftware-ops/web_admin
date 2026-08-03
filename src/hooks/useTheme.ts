import { useEffect, useState } from 'react'
import {
  getStoredTheme,
  setTheme as persistTheme,
  applyTheme,
  type Theme,
} from '../lib/theme'

/**
 * Read/write the admin portal theme. Returns the saved mode
 * ('light' | 'dark' | 'system') and a setter that persists + applies it.
 * While in 'system' mode it also follows live OS theme changes.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  const setTheme = (t: Theme) => {
    persistTheme(t)
    setThemeState(t)
  }

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  return { theme, setTheme }
}
