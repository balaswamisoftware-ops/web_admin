import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Settings as SettingsIcon,
  Save,
  QrCode,
  Smartphone,
  Megaphone,
  Target,
  IndianRupee,
  Bell,
  Music,
  Upload,
  Trophy,
  PartyPopper,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import type { ChantLevel, MissionSettings, SettingsMeta } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { ceilingOf, validateLevels } from '../lib/levels'
import { Button, useToast } from '../components/ui'
import { formatIndianCompact, formatDateTime, formatNumber } from '../lib/format'

/* ── Devotional audio ─────────────────────────────────────────── */

// `mpeg`/`mpga` are here because a browser saving a `Content-Type: audio/mpeg`
// download often names it `.mpeg` — a perfectly ordinary MP3 that Windows maps
// to `video/mpeg`, so it fails an `audio/*` filter and vanishes from the picker.
const AUDIO_EXTS = [
  'mp3', 'mpeg', 'mpga', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac',
  'weba', 'mp4',
]

/**
 * Windows builds the picker's filter list from its own registry MIME map, so a
 * bare `audio/*` can hide .mp3 when another app owns the association. Listing
 * the extensions alongside it keeps every clip selectable.
 */
const AUDIO_ACCEPT = ['audio/*', ...AUDIO_EXTS.map(e => `.${e}`)].join(',')

/** Browsers sometimes report an empty MIME type — fall back to the extension. */
function isAudioFile(file: File) {
  if (file.type.startsWith('audio/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return AUDIO_EXTS.includes(ext)
}

/* ── Community goal ───────────────────────────────────────────────────────── */

const CRORE = 10_000_000

/** Ready-made community goals, in crores — the shapes a mission actually uses. */
const GOAL_PRESETS = [11, 21, 51, 108].map(cr => cr * CRORE)

/**
 * Sensible next goals once the current one is reached. Always strictly above
 * the chants already done, so extending can never land on an already-passed
 * number, and always a whole crore so the new goal still reads as a milestone.
 */
function extensions(current: number, total: number): number[] {
  const floor = Math.max(current, total)
  const nextCrore = (n: number) => Math.ceil(n / CRORE) * CRORE
  const options = [nextCrore(floor + CRORE), nextCrore(floor * 1.5), nextCrore(floor * 2)]
  return [...new Set(options)].filter(n => n > floor).slice(0, 3)
}

/* ── Small building blocks ────────────────────────────────────────────────── */

const inputCls =
  'h-11 w-full rounded-xl border border-stone-300 bg-white px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-stone-500'

/** A titled settings section with an icon chip and optional description. */
function Section({
  icon: Icon,
  title,
  description,
  tint = 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300',
  className = '',
  children,
}: {
  icon: LucideIcon
  title: string
  description?: string
  tint?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/70 bg-white/80 p-5 shadow-sm shadow-stone-900/[0.03] backdrop-blur-sm sm:p-6 dark:border-white/10 dark:bg-neutral-900/70 ${className}`}
    >
      <div className="mb-5 flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/5 ${tint}`}
        >
          <Icon size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-stone-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-stone-500 dark:text-stone-400">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-stone-400">{hint}</span>}
    </label>
  )
}

/** An accessible on/off switch. */
function Toggle({
  checked,
  onChange,
  tone = 'brand',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  tone?: 'brand' | 'green'
}) {
  const on =
    tone === 'green' ? 'bg-emerald-500' : 'bg-brand-500'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20 ${
        checked ? on : 'bg-stone-300 dark:bg-neutral-700'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/* ── Version compare (for the min > latest warning) ───────────────────────── */

function compareVersions(a: string, b: string): number {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

/* ── Page ─────────────────────────────────────────────────────────────────── */

export function SettingsPage() {
  const [form, setForm] = useState<MissionSettings | null>(null)
  const [meta, setMeta] = useState<SettingsMeta | null>(null)
  const initialRef = useRef<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const toast = useToast()
  const audioInputRef = useRef<HTMLInputElement>(null)
  // The community goal is judged against what has actually been chanted, so the
  // page needs the live total as well as the settings row.
  const [totalChants, setTotalChants] = useState<number | null>(null)
  const [savedGoal, setSavedGoal] = useState<number | null>(null)

  useEffect(() => {
    missionAdminService
      .getSettings()
      .then(data => {
        setForm(data)
        setSavedGoal(data.communityTarget)
        initialRef.current = JSON.stringify(data)
      })
      .catch(err => setFeedback({ ok: false, msg: err.message }))
      .finally(() => setLoading(false))

    // Provenance is best-effort: the form still works if it can't be read.
    missionAdminService
      .settingsMeta()
      .then(setMeta)
      .catch(() => {})

    // Also best-effort — without it the goal field simply loses its progress
    // line and its "already reached" nudge.
    missionAdminService
      .dashboardStats()
      .then(st => setTotalChants(st.totalChants))
      .catch(() => {})
  }, [])

  const set = <K extends keyof MissionSettings>(key: K, value: MissionSettings[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev))

  const dirty = useMemo(
    () => (form ? JSON.stringify(form) !== initialRef.current : false),
    [form],
  )

  const versionWarning =
    form && compareVersions(form.minVersion, form.latestVersion) > 0
      ? 'Minimum version is higher than the latest version — even users on the newest build would be blocked. Keep minimum ≤ latest.'
      : null

  // The same rules Postgres enforces, run live so the admin sees the problem as
  // they type instead of after a failed save.
  const levelError = useMemo(
    () => (form ? validateLevels(form.chantLevels) : null),
    [form],
  )

  /**
   * A goal below the chants already done would render the mission permanently
   * over-complete. Only flagged when the admin *changes* it to such a value —
   * a goal simply overtaken by devotees is a success, not an error, and must
   * never lock the rest of the page out of saving.
   */
  const goalError = useMemo(() => {
    if (!form || totalChants === null || savedGoal === null) return null
    if (form.communityTarget === savedGoal) return null
    if (form.communityTarget < 1) return 'The community goal must be at least 1.'
    return form.communityTarget < totalChants
      ? `Devotees have already chanted ${formatNumber(totalChants)}. Set the goal above the current total.`
      : null
  }, [form, totalChants, savedGoal])

  /** The saved goal has been reached — the admin can extend the mission. */
  const goalReached =
    savedGoal !== null && totalChants !== null && totalChants >= savedGoal

  /* ── Level editing ──────────────────────────────────────────────────────── */

  const setLevels = (levels: ChantLevel[]) =>
    setForm(prev =>
      prev ? { ...prev, chantLevels: levels.map((l, i) => ({ ...l, n: i + 1 })) } : prev,
    )

  const setLevelName = (i: number, name: string) => {
    if (!form) return
    setLevels(form.chantLevels.map((l, j) => (j === i ? { ...l, name } : l)))
  }

  /**
   * Moving a boundary drags the next level's start with it, so the ladder can
   * never develop a gap or an overlap — the one shape of mistake that would be
   * tedious to repair by hand.
   */
  const setLevelTo = (i: number, to: number) => {
    if (!form) return
    setLevels(
      form.chantLevels.map((l, j) =>
        j === i ? { ...l, to } : j === i + 1 ? { ...l, from: to } : l,
      ),
    )
  }

  const addLevel = () => {
    if (!form) return
    const last = form.chantLevels[form.chantLevels.length - 1]
    const from = last ? last.to : 0
    const span = last ? Math.max(1, last.to - last.from) : 100000
    setLevels([
      ...form.chantLevels,
      { n: form.chantLevels.length + 1, name: '', from, to: from + span },
    ])
  }

  const removeLevel = () => {
    if (!form || form.chantLevels.length <= 1) return
    setLevels(form.chantLevels.slice(0, -1))
  }

  const save = async () => {
    if (!form) return
    if (levelError) {
      toast.error(levelError)
      return
    }
    if (goalError) {
      toast.error(goalError)
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      await missionAdminService.updateSettings(form)
      initialRef.current = JSON.stringify(form)
      setSavedGoal(form.communityTarget)
      setFeedback({ ok: true, msg: 'Settings saved.' })
      missionAdminService.settingsMeta().then(setMeta).catch(() => {})
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const onAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (!isAudioFile(file)) {
      toast.error('Please choose an audio file (MP3, M4A, WAV, OGG…).')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Audio must be under 20 MB.')
      return
    }
    setUploading(true)
    try {
      const url = await missionAdminService.uploadAudio(file)
      setForm(prev =>
        prev
          ? {
              ...prev,
              audioUrl: url,
              audioTitle: prev.audioTitle || file.name.replace(/\.[^.]+$/, ''),
            }
          : prev,
      )
      toast.success('Audio uploaded. Don’t forget to Save.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header — with the Save button on the same row as the title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/20">
            <SettingsIcon size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-white">Settings</h1>
            <p className="text-sm text-stone-500">
              Mission goals, payments, app version &amp; ads
            </p>
          </div>
        </div>
        {!loading && form && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-stone-400 sm:inline">
                {dirty ? 'Unsaved changes' : 'All changes saved'}
              </span>
              <Button leftIcon={Save} onPress={save} isPending={saving} isDisabled={!dirty}>
                Save settings
              </Button>
            </div>
            {/* Who touched these values last — the settings row is a single
                shared record, so this is the only way to tell. */}
            {meta?.lastChange && (
              <p className="text-[11px] text-stone-400">
                Last changed by{' '}
                <span className="font-medium text-stone-500 dark:text-stone-300">
                  {meta.lastChange.actorName ?? 'an admin'}
                </span>{' '}
                · {formatDateTime(meta.lastChange.at)}
              </p>
            )}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
            feedback.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/40'
          }`}
        >
          {feedback.ok ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          {feedback.msg}
        </div>
      )}

      {loading || !form ? (
        <div className="py-24 text-center text-stone-400">Loading settings…</div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          {/* Mission goals */}
          <Section
            icon={Target}
            title="Mission goals"
            description="How much each devotee chants toward, and the shared community goal"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Per-devotee chant goal"
                hint={`Personal goal — currently ${formatIndianCompact(form.target)}.`}
              >
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.target}
                  onChange={e => set('target', parseInt(e.target.value, 10) || 0)}
                />
              </Field>
              <Field
                label="Community achievement goal"
                hint={`Collective goal across all devotees — ${formatIndianCompact(
                  form.communityTarget,
                )} (${formatNumber(form.communityTarget)}).`}
              >
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.communityTarget}
                  onChange={e => set('communityTarget', parseInt(e.target.value, 10) || 0)}
                />
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {GOAL_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => set('communityTarget', preset)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.communityTarget === preset
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-neutral-800 dark:text-stone-300'
                  }`}
                >
                  {formatIndianCompact(preset)}
                </button>
              ))}
            </div>

            {goalError && (
              <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle size={15} className="mt-px shrink-0" />
                {goalError}
              </p>
            )}

            {/* Progress against the goal as it stands saved — and, once it is
                reached, the one-tap way to carry the mission further. */}
            {totalChants !== null && savedGoal !== null && (
              <div className="mt-4 rounded-xl border border-stone-200 p-4 dark:border-neutral-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-100">
                    {formatNumber(totalChants)} chanted
                  </span>
                  <span className="text-xs text-stone-400">
                    {Math.min(100, (totalChants / Math.max(1, savedGoal)) * 100).toFixed(2)}%
                    of {formatIndianCompact(savedGoal)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                    style={{
                      width: `${Math.min(100, (totalChants / Math.max(1, savedGoal)) * 100)}%`,
                    }}
                  />
                </div>

                {goalReached ? (
                  <div className="mt-4">
                    <p className="flex items-start gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      <PartyPopper size={16} className="mt-px shrink-0" />
                      Goal reached — devotees have completed{' '}
                      {formatIndianCompact(savedGoal)}.
                    </p>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      Extend it to keep the mission going. Nothing is reset and no
                      chant is lost — only the goal everyone is measured against
                      moves up.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {extensions(savedGoal, totalChants).map(next => (
                        <button
                          key={next}
                          type="button"
                          onClick={() => set('communityTarget', next)}
                          className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                        >
                          Extend to {formatIndianCompact(next)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-stone-400">
                    {formatNumber(Math.max(0, savedGoal - totalChants))} chants
                    remaining. Raising the goal never resets progress — the bar
                    simply measures against the new number.
                  </p>
                )}
              </div>
            )}

            {/* Per-submission input cap. Off = the devotee types whatever they
                like; on = they can submit at most the number set here. */}
            <div className="mt-5 rounded-xl border border-stone-200 p-4 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-stone-800 dark:text-stone-100">
                    Limit chants per submission
                  </div>
                  <div className="text-xs text-stone-400">
                    {form.chantLimitEnabled
                      ? 'Devotees can add at most the amount set below in one go.'
                      : 'Off — devotees can enter any amount they wish.'}
                  </div>
                </div>
                <Toggle
                  checked={form.chantLimitEnabled}
                  onChange={v => set('chantLimitEnabled', v)}
                />
              </div>

              {form.chantLimitEnabled && (
                <div className="mt-4">
                  <Field
                    label="Maximum per submission"
                    hint={
                      form.chantLimitMax >= 1
                        ? `A devotee can add up to ${form.chantLimitMax.toLocaleString('en-IN')} chants at a time (${Math.floor(form.chantLimitMax / 108).toLocaleString('en-IN')} malas).`
                        : 'Must be at least 1.'
                    }
                  >
                    <input
                      type="number"
                      min={1}
                      className={inputCls}
                      value={form.chantLimitMax}
                      onChange={e =>
                        set('chantLimitMax', parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </Field>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[108, 216, 1008, 5000].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => set('chantLimitMax', preset)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          form.chantLimitMax === preset
                            ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/50 dark:text-brand-200'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-neutral-800 dark:text-stone-300'
                        }`}
                      >
                        {preset.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs text-stone-400">
                Enforced on the server too, so the cap holds even outside the app.
                The mala counter is unaffected — every bead tapped is still counted,
                just synced in batches of this size.
              </p>
            </div>
          </Section>

          {/* Donations & payments */}
          <Section
            icon={IndianRupee}
            title="Donations & payments"
            description="Seva amount and where devotees send their donation"
            tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Donation amount (₹)">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    min={1}
                    className={`${inputCls} pl-7`}
                    value={form.donationAmount}
                    onChange={e =>
                      set('donationAmount', parseInt(e.target.value, 10) || 0)
                    }
                  />
                </div>
              </Field>
              <Field label="PhonePe number">
                <input
                  className={inputCls}
                  value={form.phonepeNumber}
                  onChange={e => set('phonepeNumber', e.target.value)}
                  placeholder="98xxxxxxxx"
                />
              </Field>
              <Field label="UPI ID">
                <input
                  className={inputCls}
                  value={form.upiId}
                  onChange={e => set('upiId', e.target.value)}
                  placeholder="name@upi"
                />
              </Field>
              <Field
                label="QR code image URL"
                hint="Public URL of the PhonePe/UPI QR shown to devotees"
              >
                <input
                  className={inputCls}
                  value={form.qrUrl}
                  onChange={e => set('qrUrl', e.target.value)}
                  placeholder="https://…/qr.png"
                />
              </Field>
            </div>

            <div className="mt-4">
              {form.qrUrl ? (
                <div className="flex items-center gap-3 rounded-xl border border-stone-200 p-3 dark:border-neutral-800">
                  <img
                    src={form.qrUrl}
                    alt="QR preview"
                    className="h-24 w-24 rounded-lg object-contain"
                    onError={e => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <span className="text-xs text-stone-400">QR preview</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-4 text-sm text-stone-400 dark:border-neutral-800">
                  <QrCode size={18} /> No QR set yet
                </div>
              )}
            </div>
          </Section>

          {/* Announcement */}
          <Section
            icon={Bell}
            title="Announcement"
            description="An optional banner message shown to devotees in the app"
            tint="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <textarea
              rows={3}
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              placeholder="e.g. Special Maha Shivaratri seva this weekend 🙏"
              value={form.announcement}
              onChange={e => set('announcement', e.target.value)}
            />
            {/* What the devotee actually sees on the Home screen. */}
            {form.announcement.trim() && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">
                  Appears in the app as
                </p>
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                  <Bell size={16} className="mt-0.5 shrink-0" />
                  <span className="whitespace-pre-wrap">{form.announcement.trim()}</span>
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-stone-400">
              Devotees see the change on their next app launch. Leave empty for no banner.
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 dark:border-neutral-800">
              <div>
                <div className="text-sm font-medium text-stone-800 dark:text-stone-100">
                  Mission active
                </div>
                <div className="text-xs text-stone-400">
                  When off, the app pauses chanting and shows a “mission paused” notice.
                </div>
              </div>
              <Toggle
                checked={form.missionActive}
                onChange={v => set('missionActive', v)}
              />
            </div>
          </Section>

          {/* App version & updates */}
          <Section
            icon={Smartphone}
            title="App version & updates"
            description="Prompt or force devotees to update after you publish a new build"
            tint="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          >
            {versionWarning && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {versionWarning}
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Latest version"
                hint="Users below this see an optional update prompt."
              >
                <input
                  className={inputCls}
                  value={form.latestVersion}
                  onChange={e => set('latestVersion', e.target.value)}
                  placeholder="1.0.0"
                />
              </Field>
              <Field
                label="Minimum supported version"
                hint="Users below this are FORCED to update. Keep ≤ latest."
              >
                <input
                  className={inputCls}
                  value={form.minVersion}
                  onChange={e => set('minVersion', e.target.value)}
                  placeholder="1.0.0"
                />
              </Field>
            </div>
            <div className="mt-5">
              <Field
                label="Update URL (store link)"
                hint="Where the Update button sends users — your store listing."
              >
                <input
                  className={inputCls}
                  value={form.updateUrl}
                  onChange={e => set('updateUrl', e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=com.srividyapitam"
                />
              </Field>
            </div>
          </Section>

          {/* Advertisements */}
          <Section
            icon={Megaphone}
            title="Advertisements"
            description="Turn ads on/off and set your AdMob unit IDs — no new build needed"
            tint="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
            className="lg:col-span-2"
          >
            {/* Master on/off switch */}
            <div
              className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                form.adsEnabled
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30'
                  : 'border-stone-200 bg-stone-50 dark:border-neutral-700 dark:bg-neutral-800/50'
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-900 dark:text-white">
                  Show advertisements in the app
                </div>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {form.adsEnabled
                    ? 'ON — devotees will see banner and full-screen ads.'
                    : 'OFF — the app is completely ad-free. Keep it off until the app is published and the ad-unit IDs below are filled in.'}
                </p>
              </div>
              <Toggle
                tone="green"
                checked={form.adsEnabled}
                onChange={v => set('adsEnabled', v)}
              />
            </div>

            {form.adsEnabled &&
              !form.admobAndroidBanner &&
              !form.admobAndroidInterstitial && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Ads are ON but no Android ad-unit ID is set — the app will still
                  show nothing. Fill in the IDs below to start earning.
                </div>
              )}

            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs text-stone-500 dark:border-neutral-800 dark:bg-neutral-800/40 dark:text-stone-400">
              The AdMob <b>App ID</b> lives in <code>app.json</code> and can’t be
              changed here — that one needs a new build.
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Android — Banner', 'admobAndroidBanner', 'Anchored banner on the screens'],
                  ['Android — Interstitial', 'admobAndroidInterstitial', 'Full-screen ad after the splash'],
                  ['iOS — Banner', 'admobIosBanner', 'Used when the iOS app ships'],
                  ['iOS — Interstitial', 'admobIosInterstitial', 'Used when the iOS app ships'],
                ] as const
              ).map(([label, key, hint]) => (
                <Field key={key} label={label} hint={hint}>
                  <input
                    className={`${inputCls} font-mono text-xs`}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder="ca-app-pub-…/…"
                  />
                </Field>
              ))}
            </div>
          </Section>

          {/* Chant levels */}
          <Section
            icon={Trophy}
            title="Chant levels"
            description="The ladder devotees climb. The end of the last level is the hard ceiling — no chant beyond it is accepted"
            tint="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            className="lg:col-span-2"
          >
            <div className="space-y-2.5">
              {form.chantLevels.map((level, i) => {
                const isLast = i === form.chantLevels.length - 1
                return (
                  <div
                    key={i}
                    className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-stone-50/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
                      {i + 1}
                    </span>
                    <div className="min-w-[9rem] flex-1">
                      <Field label="Name">
                        <input
                          className={inputCls}
                          value={level.name}
                          onChange={e => setLevelName(i, e.target.value)}
                          placeholder={`Level ${i + 1}`}
                        />
                      </Field>
                    </div>
                    <div className="w-32">
                      {/* Read-only: a level always starts where the previous one
                          ended, so a gap or an overlap is impossible to type. */}
                      <Field label="From">
                        <input
                          className={`${inputCls} bg-stone-100 text-stone-500 dark:bg-neutral-800`}
                          value={level.from.toLocaleString('en-IN')}
                          readOnly
                          tabIndex={-1}
                        />
                      </Field>
                    </div>
                    <div className="w-36">
                      <Field label={isLast ? 'To (ceiling)' : 'To'}>
                        <input
                          className={inputCls}
                          type="number"
                          min={level.from + 1}
                          step={1000}
                          value={level.to}
                          onChange={e =>
                            setLevelTo(i, Math.max(0, Math.floor(Number(e.target.value) || 0)))
                          }
                        />
                      </Field>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" leftIcon={Plus} onPress={addLevel}>
                Add level
              </Button>
              <Button
                variant="secondary"
                leftIcon={Minus}
                isDisabled={form.chantLevels.length <= 1}
                onPress={removeLevel}
              >
                Remove last
              </Button>
              <span className="text-xs text-stone-400">
                Devotees can chant up to{' '}
                <strong className="text-stone-600 dark:text-stone-300">
                  {ceilingOf(form.chantLevels).toLocaleString('en-IN')}
                </strong>{' '}
                in total.
              </span>
            </div>

            {levelError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle size={15} className="mt-px shrink-0" />
                <span>{levelError}</span>
              </div>
            )}
          </Section>

          {/* Devotional audio */}
          <Section
            icon={Music}
            title="Devotional audio"
            description="Upload a chant/audio clip devotees can play in the app — updates without a new build"
            tint="bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300"
            className="lg:col-span-2"
          >
            {/* Enable toggle */}
            <div
              className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${
                form.audioEnabled
                  ? 'border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-900/50 dark:bg-fuchsia-950/30'
                  : 'border-stone-200 bg-stone-50 dark:border-neutral-700 dark:bg-neutral-800/50'
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-900 dark:text-white">
                  Show audio player in the app
                </div>
                <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                  {form.audioEnabled
                    ? 'ON — devotees can play the clip below.'
                    : 'OFF — no audio player is shown.'}
                </p>
              </div>
              <Toggle checked={form.audioEnabled} onChange={v => set('audioEnabled', v)} />
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Audio title" hint="Shown to devotees, e.g. “Om Namah Shivaya chant”.">
                <input
                  className={inputCls}
                  value={form.audioTitle}
                  onChange={e => set('audioTitle', e.target.value)}
                  placeholder="Om Namah Shivaya"
                />
              </Field>
              <Field label="Audio URL" hint="Uploaded file URL, or paste a public MP3 link.">
                <input
                  className={`${inputCls} font-mono text-xs`}
                  value={form.audioUrl}
                  onChange={e => set('audioUrl', e.target.value)}
                  placeholder="https://…/clip.mp3"
                />
              </Field>
            </div>

            {/* Upload + preview */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input
                ref={audioInputRef}
                type="file"
                accept={AUDIO_ACCEPT}
                className="hidden"
                onChange={onAudioFile}
              />
              <Button
                variant="secondary"
                leftIcon={Upload}
                isPending={uploading}
                onPress={() => audioInputRef.current?.click()}
              >
                {form.audioUrl ? 'Replace audio' : 'Upload audio'}
              </Button>
              <span className="text-xs text-stone-400">MP3/M4A/OGG · up to 20 MB</span>
            </div>

            {form.audioUrl && (
              <div className="mt-4 rounded-xl border border-stone-200 p-3 dark:border-neutral-800">
                <div className="mb-2 text-xs font-medium text-stone-500">Preview</div>
                <audio controls src={form.audioUrl} className="w-full">
                  Your browser doesn’t support audio playback.
                </audio>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}
