import { useState } from 'react'
import {
  Trophy,
  Medal,
  Award,
  RefreshCw,
  Download,
  ScrollText,
  Flame,
  PartyPopper,
} from 'lucide-react'
import type { Completer, LeaderboardEntry } from '../types/mission'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { missionAdminService } from '../services/missionAdminService'
import {
  Badge,
  Button,
  DonationBadge,
  Pagination,
  useToast,
} from '../components/ui'
import { DevoteeDrawer } from '../components/devotees/DevoteeDrawer'
import {
  CertificateDialog,
  type CertificateSubject,
} from '../components/leaderboard/CertificateDialog'
import { formatDate, formatMobile, formatNumber } from '../lib/format'
import { exportCsv } from '../lib/exportCsv'
import { levelFor } from '../lib/levels'

/** Gold / silver / bronze for the top three, plain rank after that. */
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-sm">
        <Trophy size={16} />
      </span>
    )
  if (rank === 2)
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-stone-300 to-stone-400 text-white shadow-sm">
        <Medal size={16} />
      </span>
    )
  if (rank === 3)
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-sm">
        <Award size={16} />
      </span>
    )
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-sm font-semibold text-stone-500 dark:bg-white/10 dark:text-stone-300">
      {rank}
    </span>
  )
}

export function LeaderboardPage() {
  const {
    rows,
    total,
    milestones,
    page,
    setPage,
    pageCount,
    from,
    to,
    loading,
    error,
    refresh,
  } = useLeaderboard()

  const toast = useToast()
  const [openDevoteeId, setOpenDevoteeId] = useState<string | null>(null)
  const [certificate, setCertificate] = useState<CertificateSubject | null>(null)
  const [exporting, setExporting] = useState(false)
  const [tab, setTab] = useState<'board' | 'completers'>('board')

  const openCertificate = (entry: LeaderboardEntry | Completer, count: number) => {
    setCertificate({
      fullName: entry.fullName,
      nakshatram: entry.nakshatram,
      gothram: 'gothram' in entry ? entry.gothram : undefined,
      count,
      completedAt: entry.updatedAt,
    })
  }

  const exportBoard = async () => {
    setExporting(true)
    try {
      const { rows: all } = await missionAdminService.leaderboard(5000, 1)
      exportCsv('leaderboard', all, [
        { header: 'Rank', value: r => r.rank },
        { header: 'Devotee', value: r => r.fullName },
        { header: 'Mobile', value: r => r.mobile },
        { header: 'Nakshatram', value: r => r.nakshatram },
        { header: 'Chants', value: r => r.count },
        { header: 'Level', value: r => levelFor(r.count, levels)?.name ?? '' },
        { header: 'Malas', value: r => r.malas },
        { header: 'Percent of goal', value: r => `${r.pct}%` },
        { header: 'Goal reached', value: r => (r.completed ? 'Yes' : 'No') },
        { header: 'Seva', value: r => r.donationStatus ?? 'none' },
        { header: 'Last chanted', value: r => formatDate(r.updatedAt) },
      ])
      toast.success(`Exported ${all.length} devotee(s).`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed.')
    } finally {
      setExporting(false)
    }
  }

  const completers = milestones?.completers ?? []
  // Empty on a server that predates the ladder — `levelFor` then returns null
  // and every level chip simply disappears.
  const levels = milestones?.levels ?? []

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Trophy size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">
              Leaderboard &amp; milestones
            </div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : `${formatNumber(total)} devotees chanting · ${completers.length} reached the goal`}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={Download}
            isPending={exporting}
            onPress={exportBoard}
          >
            Export
          </Button>
          <Button variant="secondary" leftIcon={RefreshCw} onPress={refresh}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Milestone tiers */}
      {milestones && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {milestones.tiers.map(tier => (
            <div
              key={tier.label}
              className="rounded-2xl border border-stone-200/70 bg-white/80 p-4 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900/70"
            >
              <div className="mb-1 flex justify-center text-amber-500">
                <Flame size={18} />
              </div>
              <div className="text-2xl font-bold text-stone-900 dark:text-white">
                {formatNumber(tier.count)}
              </div>
              <div className="text-xs font-medium text-stone-500">{tier.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Where devotees stand on the chant ladder */}
      {levels.length > 0 && (
        <div className="mb-6 rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900/70">
          <div className="mb-4 flex items-center gap-2">
            <Award size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-stone-900 dark:text-white">
              Devotees by level
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {levels.map(level => (
              <div
                key={level.n}
                className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-center dark:border-neutral-700 dark:bg-neutral-800/40"
              >
                <div className="text-xl font-bold text-stone-900 dark:text-white">
                  {formatNumber(level.count)}
                </div>
                <div className="text-xs font-medium text-brand-600 dark:text-brand-300">
                  {level.name}
                </div>
                <div className="text-[11px] text-stone-400">
                  {formatNumber(level.from)}–{formatNumber(level.to)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-xl bg-stone-100 p-1 dark:bg-white/5">
        <button
          type="button"
          onClick={() => setTab('board')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'board'
              ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-800 dark:text-white'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Top chanters
        </button>
        <button
          type="button"
          onClick={() => setTab('completers')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            tab === 'completers'
              ? 'bg-white text-stone-900 shadow-sm dark:bg-neutral-800 dark:text-white'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
          }`}
        >
          Goal reached ({completers.length})
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-stone-400">Loading leaderboard…</div>
      ) : tab === 'board' ? (
        rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center text-stone-400 dark:border-neutral-700">
            No devotee has chanted yet.
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {rows.map(r => (
                <li
                  key={r.userId}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/80 p-3.5 shadow-sm transition-colors hover:border-brand-200 dark:border-white/10 dark:bg-neutral-900/70"
                >
                  <RankBadge rank={r.rank} />

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => r.devoteeId && setOpenDevoteeId(r.devoteeId)}
                      disabled={!r.devoteeId}
                      className="truncate text-left font-semibold text-stone-900 hover:text-brand-600 hover:underline disabled:cursor-default disabled:no-underline dark:text-white dark:hover:text-brand-300"
                    >
                      {r.fullName}
                    </button>
                    <div className="text-xs text-stone-400">
                      {formatMobile(r.mobile)}
                      {r.nakshatram ? ` · ${r.nakshatram}` : ''}
                    </div>
                    <div className="mt-1.5 h-1.5 max-w-xs overflow-hidden rounded-full bg-stone-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${Math.min(100, Math.max(r.pct, 1))}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-stone-900 dark:text-white">
                      {formatNumber(r.count)}
                    </div>
                    <div className="text-xs text-stone-400">
                      {formatNumber(r.malas)} malas · {r.pct}%
                    </div>
                    {levelFor(r.count, levels) && (
                      <div className="text-xs font-medium text-brand-600 dark:text-brand-300">
                        {levelFor(r.count, levels)?.name}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {r.completed && (
                      <Badge tone="success">
                        <PartyPopper size={11} /> Goal
                      </Badge>
                    )}
                    <DonationBadge status={r.donationStatus} />
                    {r.completed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon={ScrollText}
                        onPress={() => openCertificate(r, r.count)}
                      >
                        Certificate
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageCount={pageCount}
              from={from}
              to={to}
              total={total}
              onPage={setPage}
              label="devotees"
            />
          </>
        )
      ) : completers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 py-16 text-center text-stone-400 dark:border-neutral-700">
          No devotee has reached the personal goal yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {completers.map(c => (
            <li
              key={c.devoteeId}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/40 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                <PartyPopper size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setOpenDevoteeId(c.devoteeId)}
                  className="truncate text-left font-semibold text-stone-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-300"
                >
                  {c.fullName}
                </button>
                <div className="text-xs text-stone-500">
                  {formatMobile(c.mobile)} · {c.nakshatram || '—'} · {c.gothram || '—'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-stone-900 dark:text-white">
                  {formatNumber(c.count)}
                </div>
                <div className="text-xs text-stone-400">{formatDate(c.updatedAt)}</div>
              </div>
              <DonationBadge status={c.donationStatus} />
              <Button
                size="sm"
                variant="secondary"
                leftIcon={ScrollText}
                onPress={() => openCertificate(c, c.count)}
              >
                Certificate
              </Button>
            </li>
          ))}
        </ul>
      )}

      <CertificateDialog subject={certificate} onClose={() => setCertificate(null)} />

      <DevoteeDrawer
        devoteeId={openDevoteeId}
        onClose={() => setOpenDevoteeId(null)}
        onChanged={refresh}
      />
    </div>
  )
}
