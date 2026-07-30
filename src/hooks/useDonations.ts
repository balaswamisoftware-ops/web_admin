import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Donation, DonationStatus } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'

const ALL = 'all' as const
type Filter = typeof ALL | DonationStatus

export function useDonations() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>(ALL)
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDonations(await missionAdminService.listDonations())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load donations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const update = useCallback(
    async (id: string, status: DonationStatus, remarks: string) => {
      setBusyId(id)
      try {
        await missionAdminService.updateDonation(id, status, remarks)
        setDonations(prev =>
          prev.map(d =>
            d.id === id
              ? {
                  ...d,
                  status,
                  adminRemarks: remarks,
                  verifiedAt:
                    status === 'verified' || status === 'completed'
                      ? new Date().toISOString()
                      : d.verifiedAt,
                }
              : d,
          ),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update donation.')
      } finally {
        setBusyId(null)
      }
    },
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return donations.filter(d => {
      const matchesStatus = filter === ALL || d.status === filter
      const matchesQuery =
        !q ||
        d.fullName.toLowerCase().includes(q) ||
        d.mobile.includes(q) ||
        (d.upiTxnId ?? '').toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [donations, filter, query])

  return {
    donations: filtered,
    total: donations.length,
    pending: donations.filter(d => d.status === 'pending').length,
    loading,
    error,
    busyId,
    filter,
    setFilter,
    query,
    setQuery,
    refresh: load,
    update,
  }
}
