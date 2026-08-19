import { Trash2, Star, Pencil, Ban, CircleCheck } from 'lucide-react'
import type { Devotee } from '../../types/devotee'
import { formatMobile, formatDate, formatNumber } from '../../lib/format'
import { Button, DonationBadge, SortableHeader, type Column } from '../ui'
import type { SortDir } from '../../hooks/useServerTable'

interface DevoteesTableProps {
  devotees: Devotee[]
  deletingId: string | null
  onEdit: (devotee: Devotee) => void
  onDelete: (devotee: Devotee) => void
  onToggleBlock: (devotee: Devotee) => void
  /** Opens the 360° drawer. */
  onOpen: (devotee: Devotee) => void
  // Sorting
  sortKey: string
  sortDir: SortDir
  onSort: (key: string) => void
  // Selection (bulk actions)
  selected: Set<string>
  onToggleSelect: (id: string) => void
  onToggleAll: () => void
  allSelected: boolean
}

const COLUMNS: Column[] = [
  { key: 'name', label: 'Name' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'chants', label: 'Chants', numeric: true },
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
  onOpen,
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 py-16 text-center dark:border-neutral-700">
        <Star className="mb-3 text-stone-300" size={40} />
        <p className="font-medium text-stone-700 dark:text-stone-200">
          No devotees found
        </p>
        <p className="text-sm text-stone-400">Try a different search or filter.</p>
      </div>
    )
  }

  return (
    <div className="max-h-[60vh] overflow-auto rounded-2xl border border-stone-200 dark:border-neutral-800">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <SortableHeader
          columns={COLUMNS}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={onSort}
          leading={
            <th className="w-10 px-4 py-3">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all on this page"
              />
            </th>
          }
        >
          <th className="px-4 py-3 font-semibold">Seva</th>
          <th className="px-4 py-3 text-right font-semibold">Actions</th>
        </SortableHeader>
        <tbody>
          {devotees.map(devotee => (
            <tr
              key={devotee.id}
              onClick={() => onOpen(devotee)}
              className={`cursor-pointer border-t border-stone-100 transition-colors hover:bg-brand-50/50 dark:border-neutral-800 dark:hover:bg-white/5 ${
                selected.has(devotee.id) ? 'bg-brand-50/50 dark:bg-brand-950/20' : ''
              }`}
            >
              {/* Checkbox and action cells must not open the drawer. */}
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700">
                    {devotee.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium text-stone-900 dark:text-white">
                    {devotee.fullName}
                  </span>
                  {devotee.isBlocked && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Blocked
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                {formatMobile(devotee.mobile)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-stone-900 dark:text-white">
                {formatNumber(devotee.chantCount ?? 0)}
              </td>
              <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                {devotee.nakshatram}
              </td>
              <td className="px-4 py-3 text-stone-600 dark:text-stone-300">
                {devotee.gothram}
              </td>
              <td className="px-4 py-3 text-stone-500">
                {formatDate(devotee.createdAt)}
              </td>
              <td className="px-4 py-3">
                <DonationBadge status={devotee.donationStatus} />
              </td>
              <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
