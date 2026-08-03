import { useState, type FormEvent } from 'react'
import { Mail, Lock, LogIn, AlertCircle, Users, Flame, ShieldCheck } from 'lucide-react'
import { useAdminAuth } from '../auth/AdminAuthProvider'
import { Input, Button, BrandMark, ThemeToggle } from '../components/ui'

const HIGHLIGHTS = [
  { icon: Users, text: 'Manage devotees & registrations' },
  { icon: Flame, text: 'Track the chant mission live' },
  { icon: ShieldCheck, text: 'Verify seva donations securely' },
]

export function AdminLoginPage() {
  const { signIn, submitting, error, clearError } = useAdminAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    await signIn({ email: email.trim(), password })
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      <ThemeToggle className="absolute right-4 top-4 z-10" />
      {/* Brand story panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-maroon p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-gold/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-white/10 blur-3xl"
          aria-hidden
        />

        <div className="relative flex items-center gap-3">
          <BrandMark size={44} className="ring-1 ring-white/30" />
          <span className="font-display text-lg font-semibold">Sri Vidya Peetam</span>
        </div>

        <div className="relative">
          <h2 className="max-w-sm font-display text-4xl font-semibold leading-tight tracking-tight">
            Seva, simplified.
          </h2>
          <p className="mt-3 max-w-sm text-white/85">
            One calm place to guide the community's chant mission and honour every devotee's contribution.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon size={18} />
                </span>
                <span className="text-sm text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">
          Om Namah Shivaya · Admin Portal
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile-only brand */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <BrandMark size={56} className="shadow-lg shadow-brand-500/30" />
            <h1 className="mt-3 font-display text-2xl font-semibold text-stone-900 dark:text-white">
              Sri Vidya Peetam
            </h1>
            <p className="text-sm text-stone-500">Admin Portal</p>
          </div>

          <div className="rounded-3xl border border-stone-200/70 bg-white/90 p-7 shadow-xl shadow-stone-900/5 backdrop-blur-sm dark:border-white/10 dark:bg-neutral-900/80">
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-white">
              Welcome back
            </h2>
            <p className="mb-6 mt-1 text-sm text-stone-500">
              Sign in to your admin account
            </p>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                icon={Mail}
                placeholder="admin@srividyapitam.app"
                value={email}
                onChange={setEmail}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                icon={Lock}
                placeholder="••••••••"
                value={password}
                onChange={setPassword}
              />
              <Button
                type="submit"
                className="mt-2 w-full"
                leftIcon={LogIn}
                isPending={submitting}
              >
                Sign in
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-stone-400">
            Protected area · Authorised administrators only
          </p>
        </div>
      </div>
    </div>
  )
}
