/** One entry in the admin audit log. */
export interface AuditLog {
  id: string
  actorName: string
  actorEmail: string
  /** Machine action code, e.g. 'chant.set', 'donation.update', 'settings.update'. */
  action: string
  entityType: string
  entityId: string | null
  summary: string
  /** Whether a super admin can revert this action. */
  revertible: boolean
  /** True once this action has been reverted. */
  reverted: boolean
  revertedByName: string | null
  revertedAt: string | null
  /** If set, this entry is itself the revert of another log. */
  revertOf: string | null
  createdAt: string
}
