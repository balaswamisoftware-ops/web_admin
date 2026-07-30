import { useState } from 'react'
import { Search, RefreshCw, Users, UserPlus } from 'lucide-react'
import type { Devotee } from '../types/devotee'
import { useDevotees } from '../hooks/useDevotees'
import { Input, Button } from '../components/ui'
import { DevoteesTable } from '../components/devotees/DevoteesTable'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'
import {
  DevoteeFormDialog,
  type DevoteeFormValues,
} from '../components/devotees/DevoteeFormDialog'

export function DevoteesPage() {
  const {
    devotees,
    total,
    loading,
    error,
    deletingId,
    query,
    setQuery,
    nakshatram,
    setNakshatram,
    nakshatramOptions,
    refresh,
    create,
    update,
    remove,
    setBlocked,
  } = useDevotees()

  const [target, setTarget] = useState<Devotee | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Devotee | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (devotee: Devotee) => {
    setEditing(devotee)
    setFormOpen(true)
  }

  const submitForm = async (values: DevoteeFormValues) => {
    if (editing) {
      const { password, ...rest } = values
      return update(editing.id, {
        ...rest,
        ...(password ? { password } : {}),
      })
    }
    return create(values)
  }

  const confirmDelete = async () => {
    if (!target) return
    await remove(target.id)
    setTarget(null)
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-8 text-left">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Users size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              Devotees
            </div>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${total} registered`}
              {!loading && devotees.length !== total
                ? ` · ${devotees.length} shown`
                : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
            Refresh
          </Button>
          <Button leftIcon={UserPlus} onPress={openCreate}>
            Add devotee
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <Input
            label="Search"
            icon={Search}
            placeholder="Name, mobile or gothram"
            value={query}
            onChange={setQuery}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
          Nakshatram
          <select
            value={nakshatram}
            onChange={e => setNakshatram(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            {nakshatramOptions.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          Loading devotees…
        </div>
      ) : (
        <DevoteesTable
          devotees={devotees}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={setTarget}
          onToggleBlock={d => setBlocked(d.id, !d.isBlocked)}
        />
      )}

      <DevoteeFormDialog
        open={formOpen}
        mode={editing ? 'edit' : 'create'}
        devotee={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={submitForm}
      />

      <ConfirmDialog
        open={target !== null}
        title="Delete devotee?"
        message={`This will permanently remove ${target?.fullName ?? ''} from the devotees list.`}
        confirmLabel="Delete"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  )
}
