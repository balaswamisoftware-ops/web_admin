import { useState } from 'react'
import {
  ShieldCheck,
  Shield,
  UserPlus,
  Trash2,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react'
import type { AdminListItem } from '../types/admin'
import { useAdmins } from '../hooks/useAdmins'
import { useAdminAuth } from '../auth/AdminAuthProvider'
import { formatDate } from '../lib/format'
import { Button } from '../components/ui'
import { AddAdminDialog } from '../components/admins/AddAdminDialog'
import { ConfirmDialog } from '../components/devotees/ConfirmDialog'

export function AdminsPage() {
  const { admin: current } = useAdminAuth()
  const { admins, loading, error, busyId, create, remove, setSuperAdmin } =
    useAdmins()

  const [addOpen, setAddOpen] = useState(false)
  const [target, setTarget] = useState<AdminListItem | null>(null)

  const confirmDelete = async () => {
    if (!target) return
    await remove(target.userId)
    setTarget(null)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <ShieldCheck size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              Admins
            </div>
            <div className="text-sm text-gray-500">
              {loading ? 'Loading…' : `${admins.length} admin(s)`}
            </div>
          </div>
        </div>
        <Button leftIcon={UserPlus} onPress={() => setAddOpen(true)}>
          Add admin
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Loading admins…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-900">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(a => {
                const isSelf = a.userId === current?.id
                return (
                  <tr
                    key={a.userId}
                    className="border-t border-gray-100 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                          {a.fullName.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {a.fullName}
                          {isSelf && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {a.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                          <ShieldCheck size={13} /> Super admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-neutral-800 dark:text-gray-300">
                          <Shield size={13} /> Admin
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {a.isSuperAdmin ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={ArrowDownCircle}
                            isDisabled={isSelf || busyId === a.userId}
                            onPress={() => setSuperAdmin(a.userId, false)}
                          >
                            Demote
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={ArrowUpCircle}
                            isDisabled={busyId === a.userId}
                            onPress={() => setSuperAdmin(a.userId, true)}
                          >
                            Make super
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="danger-soft"
                          leftIcon={Trash2}
                          isDisabled={isSelf}
                          isPending={busyId === a.userId}
                          onPress={() => setTarget(a)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddAdminDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={create}
      />

      <ConfirmDialog
        open={target !== null}
        title="Delete admin?"
        message={`This permanently removes ${target?.fullName ?? ''} and their login access.`}
        confirmLabel="Delete"
        loading={busyId !== null}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  )
}
