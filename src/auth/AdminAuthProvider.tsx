import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AdminUser, AdminCredentials } from '../types/admin'
import { adminAuthService } from '../services/adminAuthService'

interface AdminAuthContextValue {
  admin: AdminUser | null
  loading: boolean
  submitting: boolean
  error: string | null
  signIn: (credentials: AdminCredentials) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminAuthService
      .getCurrentAdmin()
      .then(setAdmin)
      .catch(() => setAdmin(null))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (credentials: AdminCredentials) => {
    setSubmitting(true)
    setError(null)
    try {
      setAdmin(await adminAuthService.signIn(credentials))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      return false
    } finally {
      setSubmitting(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    await adminAuthService.signOut()
    setAdmin(null)
  }, [])

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      loading,
      submitting,
      error,
      signIn,
      signOut,
      clearError: () => setError(null),
    }),
    [admin, loading, submitting, error, signIn, signOut],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return ctx
}
