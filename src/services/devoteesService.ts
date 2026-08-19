import type {
  Devotee,
  DevoteeDetail,
  DevoteePage,
  DevoteeQuery,
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
  /**
   * One page of devotees, filtered/sorted/counted by the backend. This is what
   * the Devotees screen uses — it never downloads the whole table.
   */
  page(query: DevoteeQuery): Promise<DevoteePage>
  /** Distinct nakshatrams present, for the filter dropdown. */
  nakshatrams(): Promise<string[]>
  /** Everything the 360° drawer shows about one devotee. */
  detail(id: string): Promise<DevoteeDetail>
  /** Every devotee, newest first. Reserved for full exports. */
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
