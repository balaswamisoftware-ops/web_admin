import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Save, QrCode, Smartphone, Megaphone } from 'lucide-react'
import type { MissionSettings } from '../types/mission'
import { missionAdminService } from '../services/missionAdminService'
import { Button } from '../components/ui'
import { COMMUNITY_CHANT_TARGET } from '../constants/mission'
import { formatIndianCompact } from '../lib/format'

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
      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
      {children}
      {hint && <span className="text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

const inputCls =
  'h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'

/** Compare dot-separated versions: -1 if a<b, 0 equal, 1 if a>b. */
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

export function SettingsPage() {
  const [form, setForm] = useState<MissionSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    missionAdminService
      .getSettings()
      .then(setForm)
      .catch(err => setFeedback({ ok: false, msg: err.message }))
      .finally(() => setLoading(false))
  }, [])

  const set = <K extends keyof MissionSettings>(key: K, value: MissionSettings[K]) =>
    setForm(prev => (prev ? { ...prev, [key]: value } : prev))

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
      setFeedback({ ok: true, msg: 'Settings saved.' })
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof Error ? err.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300">
          <SettingsIcon size={22} />
        </span>
        <div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">Settings</div>
          <div className="text-sm text-gray-500">Mission target, donation &amp; payment details</div>
        </div>
      </div>

      {feedback && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${feedback.ok ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600'}`}>
          {feedback.msg}
        </div>
      )}

      {loading || !form ? (
        <div className="py-20 text-center text-gray-400">Loading settings…</div>
      ) : (
        <div className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Per-devotee chant goal"
              hint={`Each devotee's personal goal — e.g. 100000 (1 Lakh). Currently ${formatIndianCompact(form.target)}.`}
            >
              <input type="number" min={1} className={inputCls} value={form.target}
                onChange={e => set('target', parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field
              label="Community achievement goal"
              hint="Collective goal across all devotees' chants (set in code)."
            >
              <input
                readOnly
                className={`${inputCls} cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-neutral-800`}
                value={`${formatIndianCompact(COMMUNITY_CHANT_TARGET)}  (${COMMUNITY_CHANT_TARGET.toLocaleString('en-IN')})`}
              />
            </Field>
            <Field label="Donation amount (₹)">
              <input type="number" min={1} className={inputCls} value={form.donationAmount}
                onChange={e => set('donationAmount', parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field label="PhonePe number">
              <input className={inputCls} value={form.phonepeNumber}
                onChange={e => set('phonepeNumber', e.target.value)} placeholder="98xxxxxxxx" />
            </Field>
            <Field label="UPI ID">
              <input className={inputCls} value={form.upiId}
                onChange={e => set('upiId', e.target.value)} placeholder="name@upi" />
            </Field>
          </div>

          <Field label="QR code image URL" hint="Public URL of the PhonePe/UPI QR shown to devotees">
            <input className={inputCls} value={form.qrUrl}
              onChange={e => set('qrUrl', e.target.value)} placeholder="https://…/qr.png" />
          </Field>

          {form.qrUrl ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-neutral-800">
              <img src={form.qrUrl} alt="QR preview" className="h-24 w-24 rounded-lg object-contain" />
              <span className="text-xs text-gray-400">QR preview</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <QrCode size={18} /> No QR set yet
            </div>
          )}

          <Field label="Announcement / banner text" hint="Shown to devotees in the app">
            <textarea rows={3} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              value={form.announcement} onChange={e => set('announcement', e.target.value)} />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <input type="checkbox" className="h-4 w-4 accent-orange-600" checked={form.missionActive}
              onChange={e => set('missionActive', e.target.checked)} />
            Mission active
          </label>

          {/* App version & updates */}
          <div className="border-t border-gray-100 pt-5 dark:border-neutral-800">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Smartphone size={16} /> App version &amp; updates
            </div>
            <p className="mb-4 text-xs text-gray-400">
              After publishing a new app version, raise <b>Latest version</b> to prompt
              users to update. Raise <b>Minimum version</b> to force everyone below it to
              update before they can use the app.
            </p>

            {versionWarning && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {versionWarning}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Latest version"
                hint="Newest published version, e.g. 1.1.0. Users below this see an optional update prompt."
              >
                <input className={inputCls} value={form.latestVersion}
                  onChange={e => set('latestVersion', e.target.value)} placeholder="1.0.0" />
              </Field>
              <Field
                label="Minimum supported version"
                hint="Users below this are FORCED to update (blocking screen). Keep ≤ latest version."
              >
                <input className={inputCls} value={form.minVersion}
                  onChange={e => set('minVersion', e.target.value)} placeholder="1.0.0" />
              </Field>
            </div>

            <div className="mt-5">
              <Field
                label="Update URL (store link)"
                hint="Where the Update button sends users — your Play Store / App Store listing."
              >
                <input className={inputCls} value={form.updateUrl}
                  onChange={e => set('updateUrl', e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=com.srividyapitam" />
              </Field>
            </div>
          </div>

          {/* AdMob ad units */}
          <div className="border-t border-gray-100 pt-5 dark:border-neutral-800">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Megaphone size={16} /> AdMob ad units
            </div>
            <p className="mb-4 text-xs text-gray-400">
              Paste your AdMob <b>ad-unit IDs</b> (format{' '}
              <code className="rounded bg-gray-100 px-1 dark:bg-neutral-800">
                ca-app-pub-XXXXXXXX/YYYYYYYY
              </code>
              ). The app picks these up on next launch — no new build needed.
            </p>

            {/* Master on/off switch for every ad in the app. */}
            <div
              className={`mb-4 rounded-xl border p-4 ${
                form.adsEnabled
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30'
                  : 'border-gray-200 bg-gray-50 dark:border-neutral-700 dark:bg-neutral-800/50'
              }`}
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 accent-green-600"
                  checked={form.adsEnabled}
                  onChange={e => set('adsEnabled', e.target.checked)}
                />
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                    Show advertisements in the app
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {form.adsEnabled
                      ? 'ON — devotees will see banner and full-screen ads.'
                      : 'OFF — the app is completely ad-free. Keep it off until the app is published on the Play Store and the ad-unit IDs below are filled in.'}
                  </span>
                </span>
              </label>
            </div>

            {form.adsEnabled &&
              !form.admobAndroidBanner &&
              !form.admobAndroidInterstitial && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Ads are switched ON but no Android ad-unit ID is set — the app
                  will still show nothing. Fill in the IDs below to start
                  earning.
                </div>
              )}
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Note: the AdMob <b>App ID</b> is a native setting in{' '}
              <code>app.json</code> and can’t be changed here — changing it
              requires a new build.
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Android — Banner" hint="Anchored banner shown on the screens">
                <input className={inputCls} value={form.admobAndroidBanner}
                  onChange={e => set('admobAndroidBanner', e.target.value)}
                  placeholder="ca-app-pub-…/…" />
              </Field>
              <Field label="Android — Interstitial" hint="Full-screen ad after the splash">
                <input className={inputCls} value={form.admobAndroidInterstitial}
                  onChange={e => set('admobAndroidInterstitial', e.target.value)}
                  placeholder="ca-app-pub-…/…" />
              </Field>
              <Field label="iOS — Banner" hint="Used when the iOS app is released">
                <input className={inputCls} value={form.admobIosBanner}
                  onChange={e => set('admobIosBanner', e.target.value)}
                  placeholder="ca-app-pub-…/…" />
              </Field>
              <Field label="iOS — Interstitial" hint="Used when the iOS app is released">
                <input className={inputCls} value={form.admobIosInterstitial}
                  onChange={e => set('admobIosInterstitial', e.target.value)}
                  placeholder="ca-app-pub-…/…" />
              </Field>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button leftIcon={Save} onPress={save} isPending={saving}>Save settings</Button>
          </div>
        </div>
      )}
    </div>
  )
}
