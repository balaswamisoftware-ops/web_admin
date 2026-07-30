import type {
  Devotee,
  CreateDevoteeInput,
  UpdateDevoteeInput,
} from '../types/devotee'
import type { DevoteesService } from './devoteesService'

const STORAGE_KEY = 'admin/devotees'

const SEED: Devotee[] = [
  {
    id: 'seed-1',
    fullName: 'Ramakrishna Sharma',
    mobile: '9876543210',
    nakshatram: 'Rohini',
    gothram: 'Bharadwaja',
    createdAt: '2026-06-01T09:30:00.000Z',
    isBlocked: false,
  },
  {
    id: 'seed-2',
    fullName: 'Lakshmi Devi',
    mobile: '9123456780',
    nakshatram: 'Revati',
    gothram: 'Kashyapa',
    createdAt: '2026-06-14T14:10:00.000Z',
    isBlocked: false,
  },
  {
    id: 'seed-3',
    fullName: 'Venkata Subramanyam',
    mobile: '9988776655',
    nakshatram: 'Ashwini',
    gothram: 'Vasishta',
    createdAt: '2026-07-02T07:45:00.000Z',
    isBlocked: false,
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

/** Seeded localStorage-backed devotees for development without a backend. */
export const mockDevoteesService: DevoteesService = {
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
      fullName: input.fullName.trim(),
      mobile: key,
      nakshatram: input.nakshatram,
      gothram: input.gothram.trim(),
      createdAt: new Date().toISOString(),
      isBlocked: false,
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
