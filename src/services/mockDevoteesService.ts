import type {
  Devotee,
  DevoteeDetail,
  DevoteePage,
  DevoteeQuery,
  CreateDevoteeInput,
  UpdateDevoteeInput,
} from '../types/devotee'
import type { DevoteesService } from './devoteesService'

const STORAGE_KEY = 'admin/devotees'

const SEED: Devotee[] = [
  {
    id: 'seed-1',
    userId: 'seed-user-1',
    fullName: 'Ramakrishna Sharma',
    mobile: '9876543210',
    nakshatram: 'Rohini',
    gothram: 'Bharadwaja',
    createdAt: '2026-06-01T09:30:00.000Z',
    isBlocked: false,
    chantCount: 48600,
    donationStatus: 'pending',
  },
  {
    id: 'seed-2',
    userId: 'seed-user-2',
    fullName: 'Lakshmi Devi',
    mobile: '9123456780',
    nakshatram: 'Revati',
    gothram: 'Kashyapa',
    createdAt: '2026-06-14T14:10:00.000Z',
    isBlocked: false,
    chantCount: 100440,
    donationStatus: 'verified',
  },
  {
    id: 'seed-3',
    userId: 'seed-user-3',
    fullName: 'Venkata Subramanyam',
    mobile: '9988776655',
    nakshatram: 'Ashwini',
    gothram: 'Vasishta',
    createdAt: '2026-07-02T07:45:00.000Z',
    isBlocked: false,
    chantCount: 1080,
    donationStatus: null,
  },
]

function read(): Devotee[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED))
    return [...SEED]
  }
  return JSON.parse(raw) as Devotee[]
}

function write(devotees: Devotee[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devotees))
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Mirrors what `admin_list_devotees_page` does server-side, in memory. */
function applyQuery(all: Devotee[], query: DevoteeQuery): Devotee[] {
  const q = (query.query ?? '').trim().toLowerCase()
  const from = query.from ? new Date(query.from).getTime() : null
  const to = query.to ? new Date(query.to).getTime() : null

  const filtered = all.filter(d => {
    const created = new Date(d.createdAt).getTime()
    const matchesQuery =
      !q ||
      d.fullName.toLowerCase().includes(q) ||
      d.mobile.includes(q) ||
      d.gothram.toLowerCase().includes(q) ||
      d.nakshatram.toLowerCase().includes(q)
    const matchesNak =
      !query.nakshatram ||
      query.nakshatram === 'All' ||
      d.nakshatram === query.nakshatram
    const matchesStatus =
      !query.status ||
      query.status === 'all' ||
      (query.status === 'blocked') === d.isBlocked
    return (
      matchesQuery &&
      matchesNak &&
      matchesStatus &&
      (from === null || created >= from) &&
      (to === null || created < to)
    )
  })

  const dir = query.sortDir === 'asc' ? 1 : -1
  const accessors: Record<string, (d: Devotee) => string | number> = {
    name: d => d.fullName.toLowerCase(),
    mobile: d => d.mobile,
    nakshatram: d => d.nakshatram.toLowerCase(),
    gothram: d => d.gothram.toLowerCase(),
    chants: d => d.chantCount ?? 0,
    registered: d => new Date(d.createdAt).getTime(),
  }
  const accessor = accessors[query.sortKey ?? 'registered'] ?? accessors.registered
  return [...filtered].sort((a, b) => {
    const va = accessor(a)
    const vb = accessor(b)
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
}

/** Seeded localStorage-backed devotees for development without a backend. */
export const mockDevoteesService: DevoteesService = {
  async page(query: DevoteeQuery): Promise<DevoteePage> {
    await delay(250)
    const sorted = applyQuery(read(), query)
    const pageSize = query.pageSize ?? 15
    const start = ((query.page ?? 1) - 1) * pageSize
    return { rows: sorted.slice(start, start + pageSize), total: sorted.length }
  },

  async nakshatrams() {
    await delay(120)
    return Array.from(new Set(read().map(d => d.nakshatram))).sort()
  },

  async detail(id: string): Promise<DevoteeDetail> {
    await delay(200)
    const devotee = read().find(d => d.id === id)
    if (!devotee) throw new Error('Devotee not found.')
    const count = devotee.chantCount ?? 0
    // No chant_logs table without a backend — the drawer degrades to the
    // profile + totals, which is exactly what it shows for a devotee whose
    // history predates logging.
    return {
      devotee: { ...devotee, userId: devotee.userId ?? null },
      chantCount: count,
      rank: null,
      target: 100000,
      firstChantAt: null,
      lastChantAt: count > 0 ? devotee.createdAt : null,
      activeDays: 0,
      logs: [],
      donations: [],
      adminActions: [],
    }
  },

  async list() {
    await delay(400)
    return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async create(input: CreateDevoteeInput) {
    await delay(400)
    const key = input.mobile.replace(/\D/g, '').slice(-10)
    const list = read()
    if (list.some(d => d.mobile === key)) {
      throw new Error('A devotee with this mobile number already exists.')
    }
    list.push({
      id: `dev-${Math.random().toString(36).slice(2, 10)}`,
      userId: `user-${Math.random().toString(36).slice(2, 10)}`,
      fullName: input.fullName.trim(),
      mobile: key,
      nakshatram: input.nakshatram,
      gothram: input.gothram.trim(),
      createdAt: new Date().toISOString(),
      isBlocked: false,
      chantCount: 0,
      donationStatus: null,
    })
    write(list)
  },

  async update(id: string, input: UpdateDevoteeInput) {
    await delay(400)
    const key = input.mobile.replace(/\D/g, '').slice(-10)
    write(
      read().map(d =>
        d.id === id
          ? {
              ...d,
              fullName: input.fullName.trim(),
              mobile: key,
              nakshatram: input.nakshatram,
              gothram: input.gothram.trim(),
            }
          : d,
      ),
    )
  },

  async remove(id: string) {
    await delay(300)
    write(read().filter(d => d.id !== id))
  },

  async setBlocked(id: string, blocked: boolean) {
    await delay(200)
    write(read().map(d => (d.id === id ? { ...d, isBlocked: blocked } : d)))
  },
}
