import type {
  Devotee,
  CreateDevoteeInput,
  UpdateDevoteeInput,
} from '../types/devotee'
import { isSupabaseConfigured } from '../config/env'
import { mockDevoteesService } from './mockDevoteesService'
import { supabaseDevoteesService } from './supabaseDevoteesService'

/**
 * Contract for reading/managing devotees. The UI depends only on this
 * interface, so the Supabase and mock backends are fully interchangeable.
 *
 * create/update/remove touch the devotee's auth login, so in the Supabase
 * implementation they run through the `devotees-admin` Edge Function.
 */
export interface DevoteesService {
  /** All devotees, newest first. */
  list(): Promise<Devotee[]>
  create(input: CreateDevoteeInput): Promise<void>
  update(id: string, input: UpdateDevoteeInput): Promise<void>
  /** Permanently remove a devotee (and their login) by id. */
  remove(id: string): Promise<void>
  /** Block or unblock a devotee. */
  setBlocked(id: string, blocked: boolean): Promise<void>
}

export const devoteesService: DevoteesService = isSupabaseConfigured
  ? supabaseDevoteesService
  : mockDevoteesService
