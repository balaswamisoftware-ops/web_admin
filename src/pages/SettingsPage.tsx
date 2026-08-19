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
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import type { MissionSettings, SettingsMeta } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { Button, useToast } from '../components/ui'
import { COMMUNITY_CHANT_TARGET } from '../constants/mission'
import { formatIndianCompact, formatDateTime } from '../lib/format'

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

  useEffect(() => {
    missionAdminService
      .getSettings()
      .then(data => {
        setForm(data)
        initialRef.current = JSON.stringify(data)
      })
      .catch(err => setFeedback({ ok: false, msg: err.message }))
      .finally(() => setLoading(false))

    // Provenance is best-effort: the form still works if it can't be read.
    missionAdminService
      .settingsMeta()
      .then(setMeta)
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

  const save = async () => {
    if (!form) return
    setSaving(true)
    setFeedback(null)
    try {
      await missionAdminService.updateSettings(form)
      initialRef.current = JSON.stringify(form)
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
    if (!file.type.startsWith('audio/')) {
      toast.error('Please choose an audio file.')
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
                hint="Collective goal across all devotees (set in code)."
              >
                <input
                  readOnly
                  className={`${inputCls} cursor-not-allowed bg-stone-50 text-stone-500 dark:bg-neutral-800`}
                  value={`${formatIndianCompact(COMMUNITY_CHANT_TARGET)}  (${COMMUNITY_CHANT_TARGET.toLocaleString('en-IN')})`}
                />
              </Field>
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
                accept="audio/*"
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
