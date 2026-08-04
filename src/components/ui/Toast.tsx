import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (msg: string) => void
  error: (msg: string) => void
  info: (msg: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const STYLES: Record<ToastKind, { icon: typeof Info; cls: string }> = {
  success: {
    icon: CheckCircle2,
    cls: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-200',
  },
  error: {
    icon: AlertCircle,
    cls: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/60 dark:text-red-200',
  },
  info: {
    icon: Info,
    cls: 'border-stone-200 bg-white text-stone-700 dark:border-white/10 dark:bg-neutral-900 dark:text-stone-200',
  },
}

/** Wrap the app once; children get toasts via useToast(). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++idRef.current
      setToasts(t => [...t, { id, kind, message }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: m => push('success', m),
      error: m => push('error', m),
      info: m => push('info', m),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map(t => {
          const { icon: Icon, cls } = STYLES[t.kind]
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg shadow-stone-900/10 ${cls}`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1 break-words">{t.message}</span>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

/** Fire toasts: const toast = useToast(); toast.success('Saved'). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
