import { Trash2, Star, Pencil, Ban, CircleCheck, ArrowUp, ArrowDown } from 'lucide-react'
import type { Devotee } from '../../types/devotee'
import { formatMobile, formatDate } from '../../lib/format'
import { Button } from '../ui'
import type { SortDir } from '../../hooks/useTableControls'

interface DevoteesTableProps {
  devotees: Devotee[]
  deletingId: string | null
  onEdit: (devotee: Devotee) => void
  onDelete: (devotee: Devotee) => void
  onToggleBlock: (devotee: Devotee) => void
  // Sorting
  sortKey: string | null
  sortDir: SortDir
  onSort: (key: string) => void
  // Selection (bulk actions)
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  allSelected: boolean
}

const COLUMNS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'nakshatram', label: 'Nakshatram' },
  { key: 'gothram', label: 'Gothram' },
  { key: 'registered', label: 'Registered' },
]

export function DevoteesTable({
  devotees,
  deletingId,
  onEdit,
  onDelete,
  onToggleBlock,
  sortKey,
  sortDir,
  onSort,
  selected,
  onToggleSelect,
  onToggleAll,
  allSelected,
}: DevoteesTableProps) {
  if (devotees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 py-16 text-center dark:border-neutral-700">
        <Star className="mb-3 text-gray-300" size={40} />
        <p className="font-medium text-gray-700 dark:text-gray-200">
          No devotees found
        </p>
        <p className="text-sm text-gray-400">Try a different search or filter.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-neutral-800">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-neutral-900">
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all on this page"
              />
            </th>
            {COLUMNS.map(col => {
              const active = sortKey === col.key
              return (
                <th key={col.key} className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className="inline-flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    {col.label}
                    {active &&
                      (sortDir === 'asc' ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      ))}
                  </button>
                </th>
              )
            })}
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {devotees.map(devotee => (
            <tr
              key={devotee.id}
              className={`border-t border-gray-100 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-900/50 ${
                selected.has(devotee.id) ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
              }`}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-brand-600"
                  checked={selected.has(devotee.id)}
                  onChange={() => onToggleSelect(devotee.id)}
                  aria-label={`Select ${devotee.fullName}`}
                />
              </td>
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
                  <Button size="sm" variant="ghost" leftIcon={Pencil} onPress={() => onEdit(devotee)}>
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
