/** A devotee = a user who registered through the mobile app (or added here). */
export interface Devotee {
  id: string
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  createdAt: string
  isBlocked: boolean
}

export interface CreateDevoteeInput {
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  password: string
}

export interface UpdateDevoteeInput {
  fullName: string
  mobile: string
  nakshatram: string
  gothram: string
  /** Optional — only set to change the devotee's login password. */
  password?: string
}
