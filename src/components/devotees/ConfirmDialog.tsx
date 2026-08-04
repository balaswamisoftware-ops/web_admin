import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui'
import { useModalA11y } from '../../hooks/useModalA11y'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Minimal, dependency-free confirmation modal. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useModalA11y(open, onCancel)
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertTriangle size={20} />
          </span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onPress={onCancel} isDisabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onPress={onConfirm} isPending={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
