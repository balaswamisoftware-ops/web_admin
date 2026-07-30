import { Trash2, Star, Pencil, Ban, CircleCheck } from 'lucide-react'
import type { Devotee } from '../../types/devotee'
import { formatMobile, formatDate } from '../../lib/format'
import { Button } from '../ui'

interface DevoteesTableProps {
  devotees: Devotee[]
  deletingId: string | null
  onEdit: (devotee: Devotee) => void
  onDelete: (devotee: Devotee) => void
  onToggleBlock: (devotee: Devotee) => void
}

export function DevoteesTable({
  devotees,
  deletingId,
  onEdit,
  onDelete,
  onToggleBlock,
}: DevoteesTableProps) {
  if (devotees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16 text-center dark:border-neutral-700">
        <Star className="mb-3 text-gray-300" size={40} />
        <p className="font-medium text-gray-700 dark:text-gray-200">
          No devotees found
        </p>
        <p className="text-sm text-gray-400">
          Try a different search or filter.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-900">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Mobile</th>
            <th className="px-4 py-3 font-semibold">Nakshatram</th>
            <th className="px-4 py-3 font-semibold">Gothram</th>
            <th className="px-4 py-3 font-semibold">Registered</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {devotees.map(devotee => (
            <tr
              key={devotee.id}
              className="border-t border-gray-100 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                    {devotee.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {devotee.fullName}
                  </span>
                  {devotee.isBlocked && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Blocked
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                {formatMobile(devotee.mobile)}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                {devotee.nakshatram}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                {devotee.gothram}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {formatDate(devotee.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={Pencil}
                    onPress={() => onEdit(devotee)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={devotee.isBlocked ? CircleCheck : Ban}
                    onPress={() => onToggleBlock(devotee)}
                  >
                    {devotee.isBlocked ? 'Unblock' : 'Block'}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger-soft"
                    leftIcon={Trash2}
                    isPending={deletingId === devotee.id}
                    onPress={() => onDelete(devotee)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
