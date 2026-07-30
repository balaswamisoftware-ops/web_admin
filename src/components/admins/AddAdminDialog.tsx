import { useState } from 'react'
import { UserPlus, Mail, Lock, User, ShieldCheck, X } from 'lucide-react'
import type { CreateAdminInput } from '../../types/admin'
import { Input, Button } from '../ui'

interface AddAdminDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (input: CreateAdminInput) => Promise<string | null>
}

export function AddAdminDialog({ open, onClose, onCreate }: AddAdminDialogProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  const reset = () => {
    setFullName('')
    setEmail('')
    setPassword('')
    setIsSuperAdmin(false)
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    setError(null)
    if (fullName.trim().length < 3) return setError('Enter the full name.')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
      return setError('Enter a valid email address.')
    if (password.length < 6)
      return setError('Password must be at least 6 characters.')

    setSubmitting(true)
    const err = await onCreate({ fullName, email, password, isSuperAdmin })
    setSubmitting(false)
    if (err) {
      setError(err)
      return
    }
    close()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <UserPlus size={20} />
            </span>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add admin
            </h2>
          </div>
          <button type="button" onClick={close} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Input label="Full name" icon={User} placeholder="Full name" value={fullName} onChange={setFullName} />
          <Input label="Email" type="email" icon={Mail} placeholder="admin@example.com" value={email} onChange={setEmail} />
          <Input label="Password" type="password" icon={Lock} placeholder="At least 6 characters" value={password} onChange={setPassword} />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
            <input
              type="checkbox"
              checked={isSuperAdmin}
              onChange={e => setIsSuperAdmin(e.target.checked)}
              className="mt-1 h-4 w-4 accent-orange-600"
            />
            <span className="flex flex-col">
              <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                <ShieldCheck size={15} className="text-orange-600" />
                Super admin
              </span>
              <span className="text-xs text-gray-500">
                Can also manage other admins, not just devotees.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onPress={close} isDisabled={submitting}>
            Cancel
          </Button>
          <Button leftIcon={UserPlus} onPress={submit} isPending={submitting}>
            Create admin
          </Button>
        </div>
      </div>
    </div>
  )
}
