import { useEffect, useState } from 'react'
import { User, Phone, Users, Lock, Save, X, Star } from 'lucide-react'
import type { Devotee } from '../../types/devotee'
import { NAKSHATRAMS } from '../../constants/nakshatram'
import { Input, Button, Select } from '../ui'

export interface DevoteeFormValues {
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  password: string
}

interface DevoteeFormDialogProps {
  open: boolean
  mode: 'create' | 'edit'
  devotee?: Devotee | null
  onClose: () => void
  onSubmit: (values: DevoteeFormValues) => Promise<string | null>
}

const empty: DevoteeFormValues = {
  fullName: '',
  mobile: '',
  nakshatram: '',
  gothram: '',
  password: '',
}

export function DevoteeFormDialog({
  open,
  mode,
  devotee,
  onClose,
  onSubmit,
}: DevoteeFormDialogProps) {
  const [values, setValues] = useState<DevoteeFormValues>(empty)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)
    setValues(
      mode === 'edit' && devotee
        ? {
            fullName: devotee.fullName,
            mobile: devotee.mobile,
            nakshatram: devotee.nakshatram,
            gothram: devotee.gothram,
            password: '',
          }
        : empty,
    )
  }, [open, mode, devotee])

  if (!open) return null

  const set = (key: keyof DevoteeFormValues) => (v: string) =>
    setValues(prev => ({ ...prev, [key]: v }))

  const submit = async () => {
    setError(null)
    const mobile = values.mobile.replace(/\D/g, '').slice(-10)
    if (values.fullName.trim().length < 3) return setError('Enter the full name.')
    if (!/^[6-9]\d{9}$/.test(mobile))
      return setError('Enter a valid 10-digit mobile number.')
    if (!(NAKSHATRAMS as readonly string[]).includes(values.nakshatram))
      return setError('Select a nakshatram.')
    if (values.gothram.trim().length < 2) return setError('Enter the gothram.')
    if (mode === 'create' && values.password.length < 6)
      return setError('Set a password (at least 6 characters).')
    if (mode === 'edit' && values.password && values.password.length < 6)
      return setError('New password must be at least 6 characters.')

    setSubmitting(true)
    const err = await onSubmit({ ...values, mobile })
    setSubmitting(false)
    if (err) return setError(err)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Add devotee' : 'Edit devotee'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Input label="Full name" icon={User} placeholder="Full name" value={values.fullName} onChange={set('fullName')} />
          <Input label="Mobile number" icon={Phone} placeholder="10-digit mobile" value={values.mobile} onChange={set('mobile')} />

          <Select
            label="Nakshatram"
            icon={Star}
            placeholder="Select nakshatram…"
            value={values.nakshatram}
            onChange={set('nakshatram')}
            options={NAKSHATRAMS}
          />

          <Input label="Gothram" icon={Users} placeholder="Gothram" value={values.gothram} onChange={set('gothram')} />
          <Input
            label={mode === 'create' ? 'Password' : 'New password (optional)'}
            type="password"
            icon={Lock}
            placeholder={mode === 'create' ? 'At least 6 characters' : 'Leave blank to keep current'}
            value={values.password}
            onChange={set('password')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onPress={onClose} isDisabled={submitting}>
            Cancel
          </Button>
          <Button leftIcon={Save} onPress={submit} isPending={submitting}>
            {mode === 'create' ? 'Create devotee' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
