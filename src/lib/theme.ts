/**
 * Theme handling for the admin portal.
 *
 * The chosen mode ('light' | 'dark' | 'system') is persisted in localStorage
 * and applied by setting `data-theme="light|dark"` on <html>. The `dark:`
 * Tailwind variant is wired to that attribute in index.css, and an inline
 * script in index.html applies it before first paint to avoid a flash.
 */
export type Theme = 'light' | 'dark' | 'system'

const KEY = 'admin-theme'

/** The user's saved preference, defaulting to 'system'. */
export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    if (t === 'light' || t === 'dark' || t === 'system') return t
  } catch {
    /* localStorage unavailable — fall through to default */
  }
  return 'system'
}

/** Resolve 'system' to the concrete light/dark the OS currently prefers. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

/** Apply a theme to the document (sets data-theme on <html>). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = resolveTheme(theme)
}

/** Persist + apply a theme. */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore persistence failure — still apply for this session */
  }
  applyTheme(theme)
}
