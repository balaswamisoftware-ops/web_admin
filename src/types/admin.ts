export interface AdminUser {
  id: string
  email: string
  fullName: string
  isSuperAdmin: boolean
}

export interface AdminCredentials {
  email: string
  password: string
}

/** A row in the admins list (management view). */
export interface AdminListItem {
  userId: string
  email: string
  fullName: string
  isSuperAdmin: boolean
  createdAt: string
}

export interface CreateAdminInput {
  fullName: string
  email: string
  password: string
  isSuperAdmin: boolean
}
