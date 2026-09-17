import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  AlertTriangle,
  Award,
  BadgeCheck,
  CheckCircle2,
  ChevronDown,
  Medal,
  Minus,
  Plus,
  Save,
  Trophy,
} from 'lucide-react'
import type { ChantLevel, LevelCertificate } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { ceilingOf, validateLevels } from '../lib/levels'
import {
  DEFAULT_CERT_COLOR,
  DEFAULT_CERT_FONT,
  isCertificateComplete,
} from '../lib/certificate'
import { Button, useToast } from '../components/ui'
import { Field, Section, Toggle, inputCls } from '../components/settings/SettingsSection'
import { CertificateEditor } from '../components/levels/CertificateEditor'

/**
 * The chant-level ladder devotees climb, each level's certificate, and the
 * switch that lets devotees download them — on one page.
 *
 * Everything lives in the single `settings` row: the ladder (with each level's
 * `certificate` inside it) in `chant_levels`, the switch in
 * `certificates_enabled`. This page saves ONLY those two as a partial patch
 * through the audited `admin_update_settings` RPC, so every change stays
 * snapshotted and revertible. The Settings page leaves both out of its own
 * save so it can never write a stale copy back.
 */

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** Natural pixel size of a local image file, read before uploading it. */
function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      reject(new Error('That file could not be read as an image.'))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export function ChantLevelsPage() {
  const [levels, setLevelsState] = useState<ChantLevel[] | null>(null)
  const [savedLevels, setSavedLevels] = useState('')
  // null = the `certificates_enabled` column doesn't exist yet (SQL not run).
  const [certsEnabled, setCertsEnabled] = useState<boolean | null>(null)
  const [savedCertsEnabled, setSavedCertsEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [openCert, setOpenCert] = useState<number | null>(null)
  const [uploadingLevel, setUploadingLevel] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingLevelRef = useRef<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    missionAdminService
      .getSettings()
      .then(data => {
        setLevelsState(data.chantLevels)
        setSavedLevels(JSON.stringify(data.chantLevels))
        setCertsEnabled(data.certificatesEnabled)
        setSavedCertsEnabled(data.certificatesEnabled)
      })
      .catch(err => setFeedback({ ok: false, msg: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const dirty =
    levels !== null &&
    (JSON.stringify(levels) !== savedLevels || certsEnabled !== savedCertsEnabled)

  // The same rules Postgres enforces, run live so the admin sees the problem as
  // they type instead of after a failed save.
  const levelError = useMemo(() => (levels ? validateLevels(levels) : null), [levels])

  /** An image with no name position is unusable, so it blocks Save. */
  const certError = useMemo(() => {
    const incomplete = levels?.find(l => l.certificate && !l.certificate.box)
    return incomplete
      ? `Mark where the name goes on the “${incomplete.name || `Level ${incomplete.n}`}” certificate — drag a box over it.`
      : null
  }, [levels])

  /** Downloads switched on, but some levels have nothing to download. Advisory. */
  const missingCerts = useMemo(
    () =>
      certsEnabled && levels
        ? levels.filter(l => !isCertificateComplete(l.certificate)).map(l => l.name || `Level ${l.n}`)
        : [],
    [certsEnabled, levels],
  )

  /* ── Level editing ──────────────────────────────────────────────────────── */

  const setLevels = (next: ChantLevel[]) =>
    setLevelsState(next.map((l, i) => ({ ...l, n: i + 1 })))

  const setLevelName = (i: number, name: string) => {
    if (!levels) return
    setLevels(levels.map((l, j) => (j === i ? { ...l, name } : l)))
  }

  /**
   * Moving a boundary drags the next level's start with it, so the ladder can
   * never develop a gap or an overlap — the one shape of mistake that would be
   * tedious to repair by hand.
   */
  const setLevelTo = (i: number, to: number) => {
    if (!levels) return
    setLevels(
      levels.map((l, j) => (j === i ? { ...l, to } : j === i + 1 ? { ...l, from: to } : l)),
    )
  }

  const addLevel = () => {
    if (!levels) return
    const last = levels[levels.length - 1]
    const from = last ? last.to : 0
    const span = last ? Math.max(1, last.to - last.from) : 100000
    setLevels([...levels, { n: levels.length + 1, name: '', from, to: from + span }])
  }

  const removeLevel = () => {
    if (!levels || levels.length <= 1) return
    if (openCert === levels.length - 1) setOpenCert(null)
    setLevels(levels.slice(0, -1))
  }

  /* ── Certificates ───────────────────────────────────────────────────────── */

  const setCertificate = (i: number, certificate: LevelCertificate | null) => {
    if (!levels) return
    setLevels(levels.map((l, j) => (j === i ? { ...l, certificate } : l)))
  }

  const pickImage = (i: number) => {
    pendingLevelRef.current = i
    fileInputRef.current?.click()
  }

  const onImageFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    const i = pendingLevelRef.current
    pendingLevelRef.current = null
    if (!file || i === null || !levels) return
    if (!IMAGE_TYPES.includes(file.type)) {
      toast.error('Please choose a PNG, JPG or WebP image.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error('Certificate images must be under 10 MB.')
      return
    }

    setUploadingLevel(i)
    try {
      const { width, height } = await imageSize(file)
      const imageUrl = await missionAdminService.uploadCertificateImage(i + 1, file)
      const existing = levels[i].certificate
      // Keep the marked position on a replacement — it is stored as fractions of
      // the image, so it still lands in the same place on a same-layout redesign.
      setCertificate(i, {
        imageUrl,
        width,
        height,
        box: existing?.box ?? null,
        color: existing?.color ?? DEFAULT_CERT_COLOR,
        font: existing?.font ?? DEFAULT_CERT_FONT,
      })
      setOpenCert(i)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploadingLevel(null)
    }
  }

  const save = async () => {
    if (!levels) return
    const problem = levelError ?? certError
    if (problem) {
      toast.error(problem)
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      await missionAdminService.updateSettings({
        chantLevels: levels,
        ...(certsEnabled !== null ? { certificatesEnabled: certsEnabled } : {}),
      })
      setSavedLevels(JSON.stringify(levels))
      setSavedCertsEnabled(certsEnabled)
      setFeedback({ ok: true, msg: 'Chant levels saved.' })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header — with the Save button on the same row as the title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/20">
            <Medal size={22} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-stone-900 dark:text-white">Chant levels</h1>
            <p className="text-sm text-stone-500">
              The ladder devotees climb, and the certificate for each level
            </p>
          </div>
        </div>
        {!loading && levels && (
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-stone-400 sm:inline">
              {dirty ? 'Unsaved changes' : 'All changes saved'}
            </span>
            <Button leftIcon={Save} onPress={save} isPending={saving} isDisabled={!dirty}>
              Save levels
            </Button>
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

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={onImageFile}
      />

      {loading || !levels ? (
        <div className="py-24 text-center text-stone-400">Loading chant levels…</div>
      ) : (
        <div className="space-y-5">
          {/* Certificate downloads */}
          <Section
            icon={Award}
            title="Certificate downloads"
            description="Let devotees download the certificate for the level they have reached"
            tint="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 p-3.5 dark:border-neutral-700">
              <div className="min-w-0">
                <div className="text-sm font-medium text-stone-900 dark:text-white">
                  Allow devotees to download certificates
                </div>
                <div className="text-xs text-stone-500 dark:text-stone-400">
                  {certsEnabled === null
                    ? 'Unavailable until certificates.sql is run in Supabase.'
                    : certsEnabled
                      ? 'ON — devotees can download their level certificate.'
                      : 'OFF — no certificate downloads are offered.'}
                </div>
              </div>
              <Toggle
                checked={certsEnabled === true}
                onChange={setCertsEnabled}
                tone="green"
                disabled={certsEnabled === null}
              />
            </div>

            <p className="mt-3 text-xs text-stone-400">
              The download button in the app arrives with the next app update — until then
              this switch is saved but devotees won’t see anything.
            </p>

            {missingCerts.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle size={15} className="mt-px shrink-0" />
                <span>
                  Downloads are on, but {missingCerts.join(', ')}{' '}
                  {missingCerts.length === 1 ? 'has' : 'have'} no finished certificate yet —
                  devotees at {missingCerts.length === 1 ? 'that level' : 'those levels'} won’t
                  get one.
                </span>
              </div>
            )}
          </Section>

          {/* Levels */}
          <Section
            icon={Trophy}
            title="Levels"
            description="The end of the last level is the hard ceiling — no chant beyond it is accepted. Changes reach the app on its next open, no new build needed."
            tint="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <div className="space-y-2.5">
              {levels.map((level, i) => {
                const isLast = i === levels.length - 1
                const cert = level.certificate ?? null
                const isOpen = openCert === i && cert !== null
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 dark:border-neutral-700 dark:bg-neutral-800/40"
                  >
                    <div className="flex flex-wrap items-end gap-3">
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

                    {/* Certificate status + open/close */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-200/70 pt-3 dark:border-neutral-700/70">
                      {!cert ? (
                        <>
                          <span className="text-xs text-stone-400">No certificate</span>
                          <Button
                            variant="secondary"
                            leftIcon={Award}
                            isPending={uploadingLevel === i}
                            onPress={() => pickImage(i)}
                          >
                            Add certificate
                          </Button>
                        </>
                      ) : (
                        <>
                          {cert.box ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <BadgeCheck size={13} /> Certificate ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                              <AlertTriangle size={13} /> Name position needed
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenCert(isOpen ? null : i)}
                            aria-expanded={isOpen}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-white/5"
                          >
                            {isOpen ? 'Hide certificate' : 'Edit certificate'}
                            <ChevronDown
                              size={15}
                              className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          </button>
                        </>
                      )}
                    </div>

                    {isOpen && cert && (
                      <CertificateEditor
                        cert={cert}
                        levelName={level.name || `Level ${i + 1}`}
                        uploading={uploadingLevel === i}
                        onChange={next => setCertificate(i, next)}
                        onReplace={() => pickImage(i)}
                        onRemove={() => {
                          setCertificate(i, null)
                          setOpenCert(null)
                        }}
                      />
                    )}
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
                isDisabled={levels.length <= 1}
                onPress={removeLevel}
              >
                Remove last
              </Button>
              <span className="text-xs text-stone-400">
                Devotees can chant up to{' '}
                <strong className="text-stone-600 dark:text-stone-300">
                  {ceilingOf(levels).toLocaleString('en-IN')}
                </strong>{' '}
                in total.
              </span>
            </div>

            {(levelError || certError) && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <AlertTriangle size={15} className="mt-px shrink-0" />
                <span>{levelError ?? certError}</span>
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}
