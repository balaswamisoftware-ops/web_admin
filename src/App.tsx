import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { AdminAuthProvider, useAdminAuth } from './auth/AdminAuthProvider'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AppShell } from './components/layout/AppShell'
import { DashboardPage } from './pages/DashboardPage'
import { DevoteesPage } from './pages/DevoteesPage'
import { ChantsPage } from './pages/ChantsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { ReportsPage } from './pages/ReportsPage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { NotificationsPage } from './pages/NotificationsPage'
// Lazy — pulls in three.js/globe only when an admin opens the map.
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })))
import { SettingsPage } from './pages/SettingsPage'
import { AdminsPage } from './pages/AdminsPage'
import { AuditLogsPage } from './pages/AuditLogsPage'

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  )
}

/** Gate: must be a signed-in admin, else go to /login. */
function RequireAuth() {
  const { admin, loading } = useAdminAuth()
  if (loading) return <Loader />
  if (!admin) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Gate: super admins only, else back to the dashboard. */
function RequireSuperAdmin() {
  const { admin } = useAdminAuth()
  if (!admin?.isSuperAdmin) return <Navigate to="/" replace />
  return <Outlet />
}

/** Login route: bounce to the app if already signed in. */
function LoginRoute() {
  const { admin, loading } = useAdminAuth()
  if (loading) return <Loader />
  if (admin) return <Navigate to="/" replace />
  return <AdminLoginPage />
}

function App() {
  return (
    <ToastProvider>
      <AdminAuthProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="devotees" element={<DevoteesPage />} />
              <Route path="chants" element={<ChantsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="leaderboard" element={<LeaderboardPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route
                path="map"
                element={
                  <Suspense fallback={<Loader />}>
                    <MapPage />
                  </Suspense>
                }
              />
              <Route path="reports" element={<ReportsPage />} />

              <Route element={<RequireSuperAdmin />}>
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admins" element={<AdminsPage />} />
                <Route path="audit" element={<AuditLogsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </ToastProvider>
  )
}

export default App
