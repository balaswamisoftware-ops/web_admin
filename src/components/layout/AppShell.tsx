import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Flame,
  HandCoins,
  FileBarChart,
  Trophy,
  Bell,
  Settings as SettingsIcon,
  ShieldCheck,
  History,
  LogOut,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAdminAuth } from '../../auth/AdminAuthProvider'
import { BrandMark, ThemeToggle } from '../ui'

type NavItem = { to: string; label: string; icon: LucideIcon; superOnly?: boolean; end?: boolean }

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/devotees', label: 'Devotees', icon: Users },
  { to: '/chants', label: 'Chants', icon: Flame },
  { to: '/payments', label: 'Payments', icon: HandCoins },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/notifications', label: 'Broadcasts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, superOnly: true },
  { to: '/admins', label: 'Admins', icon: ShieldCheck, superOnly: true },
  { to: '/audit', label: 'Audit log', icon: History, superOnly: true },
]

function Wordmark() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark size={40} className="shadow-lg shadow-brand-500/25" />
      <div className="leading-tight">
        <div className="font-display text-[15px] font-semibold tracking-tight text-stone-900 dark:text-white">
          Sri Vidya Peetam
        </div>
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-600/80 dark:text-brand-300/80">
          Admin Portal
        </div>
      </div>
    </div>
  )
}

/** Desktop sidebar nav link with an active accent bar + saffron tint. */
function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-500/10 dark:bg-brand-950/40 dark:text-brand-200'
            : 'text-stone-600 hover:bg-stone-100/80 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-white/5 dark:hover:text-white',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-500 transition-all duration-200',
              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-40',
            ].join(' ')}
          />
          <Icon
            size={18}
            className={isActive ? 'text-brand-600 dark:text-brand-300' : ''}
          />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export function AppShell() {
  const { admin, signOut } = useAdminAuth()
  const nav = NAV.filter(item => !item.superOnly || admin?.isSuperAdmin)
  const initial = (admin?.fullName ?? 'A').charAt(0).toUpperCase()

  // On phones the nav is a horizontal-scroll strip; keep the active pill in
  // view whenever the route changes so it never scrolls off-screen.
  const mobileNavRef = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => {
    const active = mobileNavRef.current?.querySelector('[aria-current="page"]')
    active?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [pathname])

  return (
    <div className="flex min-h-screen text-stone-900 dark:text-stone-100">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-200/70 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/60 md:flex">
        <div className="mb-8 px-1 pt-2">
          <Wordmark />
        </div>

        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
          Menu
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map(item => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>

        <div className="mt-auto">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-sm">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-stone-800 dark:text-white">
                {admin?.fullName ?? 'Admin'}
              </div>
              <div className="truncate text-xs text-stone-400">{admin?.email}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={signOut}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              <LogOut size={17} />
              Log out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70 md:hidden">
          <div className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <span className="font-display font-semibold">Sri Vidya Peetam</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-2 py-1 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Log out
            </button>
          </div>
        </header>

        {/* Mobile nav */}
        <div
          ref={mobileNavRef}
          className="sticky top-[57px] z-10 flex gap-2 overflow-x-auto border-b border-stone-200/70 bg-white/80 px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/70 md:hidden"
        >
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'text-stone-500 hover:bg-stone-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <main className="flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
