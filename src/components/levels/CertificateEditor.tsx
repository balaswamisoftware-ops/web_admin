import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { AlertTriangle, Download, Eraser, ImageUp, Trash2 } from 'lucide-react'
import type { CertificateBox, CertificateFont, LevelCertificate } from '../../types/mission'
import { CERT_FONTS, drawCertificate } from '../../lib/certificate'
import { Button, useToast } from '../ui'
import { Field, inputCls } from '../settings/SettingsSection'

/**
 * Edit one level's certificate: drag across the image to mark where the name
 * goes (drag inside the box to move it), pick the colour and font, and preview
 * the result with any name — long names visibly shrink to fit the box.
 *
 * The preview is the real renderer (`drawCertificate`) at full resolution, so
 * what the admin sees and downloads here is exactly what a devotee would get.
 */

/** Long enough to show the shrink-to-fit behaviour on first open. */
const SAMPLE_NAME = 'Sri Venkata Subrahmanya Sharma'

/** Drags smaller than this are treated as a click, not a new box. */
const MIN_W = 0.02
const MIN_H = 0.015

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))
const round4 = (n: number) => Math.round(n * 10000) / 10000
const pct = (n: number) => `${(n * 100).toFixed(1)}%`

type Drag =
  | { mode: 'draw'; sx: number; sy: number }
  | { mode: 'move'; ox: number; oy: number; start: CertificateBox }

export function CertificateEditor({
  cert,
  levelName,
  uploading,
  onChange,
  onReplace,
  onRemove,
}: {
  cert: LevelCertificate
  levelName: string
  uploading: boolean
  onChange: (next: LevelCertificate) => void
  onReplace: () => void
  onRemove: () => void
}) {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Keyed by URL, so after "Replace image" the previous picture is ignored
  // straight away rather than reset from inside the loading effect.
  const [loaded, setLoaded] = useState<{ url: string; img: HTMLImageElement } | null>(null)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const image = loaded?.url === cert.imageUrl ? loaded.img : null
  const imageFailed = failedUrl === cert.imageUrl
  const [previewName, setPreviewName] = useState(SAMPLE_NAME)

  // The box follows the pointer locally while dragging and is committed once on
  // release, so the level list isn't re-rendered on every pointer move.
  const [draft, setDraft] = useState<CertificateBox | null>(null)
  const draftRef = useRef<CertificateBox | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const box = draft ?? cert.box

  useEffect(() => {
    let alive = true
    const url = cert.imageUrl
    const img = new Image()
    // Needed so the canvas stays exportable for "Download sample".
    img.crossOrigin = 'anonymous'
    img.onload = () => alive && setLoaded({ url, img })
    img.onerror = () => alive && setFailedUrl(url)
    img.src = url
    return () => {
      alive = false
    }
  }, [cert.imageUrl])

  useEffect(() => {
    if (!image || !canvasRef.current) return
    drawCertificate(canvasRef.current, image, { ...cert, box }, previewName)
  }, [image, cert, box, previewName])

  const setDraftBox = (b: CertificateBox | null) => {
    draftRef.current = b
    setDraft(b)
  }

  const pointAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return {
      fx: clamp01((e.clientX - r.left) / r.width),
      fy: clamp01((e.clientY - r.top) / r.height),
    }
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { fx, fy } = pointAt(e)
    const b = cert.box
    if (b && fx >= b.x && fx <= b.x + b.w && fy >= b.y && fy <= b.y + b.h) {
      dragRef.current = { mode: 'move', ox: fx - b.x, oy: fy - b.y, start: b }
      setDraftBox(b)
    } else {
      dragRef.current = { mode: 'draw', sx: fx, sy: fy }
      setDraftBox({ x: fx, y: fy, w: 0, h: 0 })
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const { fx, fy } = pointAt(e)
    if (d.mode === 'draw') {
      setDraftBox({
        x: Math.min(d.sx, fx),
        y: Math.min(d.sy, fy),
        w: Math.abs(fx - d.sx),
        h: Math.abs(fy - d.sy),
      })
    } else {
      const { start } = d
      setDraftBox({
        ...start,
        x: Math.min(Math.max(0, fx - d.ox), 1 - start.w),
        y: Math.min(Math.max(0, fy - d.oy), 1 - start.h),
      })
    }
  }

  const endDrag = () => {
    const d = dragRef.current
    const next = draftRef.current
    dragRef.current = null
    setDraftBox(null)
    if (!d || !next) return
    // A stray click shouldn't wipe out a box that was carefully placed.
    if (d.mode === 'draw' && (next.w < MIN_W || next.h < MIN_H)) return
    onChange({
      ...cert,
      box: { x: round4(next.x), y: round4(next.y), w: round4(next.w), h: round4(next.h) },
    })
  }

  const downloadSample = () => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const slug = levelName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'level'
    try {
      canvas.toBlob(blob => {
        if (!blob) {
          toast.error('Could not create the sample image.')
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${slug}-certificate-sample.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }, 'image/png')
    } catch {
      // A canvas holding an image served without CORS headers can't be exported.
      toast.error('This image blocks downloads from the browser. Try re-uploading it.')
    }
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
      {imageFailed ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
          <AlertTriangle size={16} className="shrink-0" />
          Couldn’t load this certificate image. Replace it to continue.
        </div>
      ) : (
        <div>
          <p className="mb-2 text-xs text-stone-500 dark:text-stone-400">
            {box
              ? 'Drag inside the box to move it, or drag elsewhere to draw a new one.'
              : 'Drag across the certificate to mark where the devotee’s name goes.'}
          </p>
          <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100 dark:border-neutral-700 dark:bg-neutral-800">
            <canvas ref={canvasRef} className={image ? 'block h-auto w-full' : 'hidden'} />
            {!image && (
              <div className="flex aspect-[4/3] items-center justify-center text-sm text-stone-400">
                Loading certificate…
              </div>
            )}
            {image && (
              <div
                className="absolute inset-0 cursor-crosshair touch-none select-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                {box && (
                  <div
                    className="pointer-events-none absolute border-2 border-dashed border-brand-500 bg-brand-500/10"
                    style={{
                      left: pct(box.x),
                      top: pct(box.y),
                      width: pct(box.w),
                      height: pct(box.h),
                    }}
                  >
                    <span className="absolute -top-6 left-0 whitespace-nowrap rounded bg-brand-500 px-1.5 py-0.5 text-[11px] font-medium text-white">
                      Name area
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {cert.box && (
            <p className="mt-1.5 text-[11px] tabular-nums text-stone-400">
              From {pct(cert.box.x)} left, {pct(cert.box.y)} top · {pct(cert.box.w)} wide ×{' '}
              {pct(cert.box.h)} tall · image {cert.width}×{cert.height}px
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Preview name" hint="Try a long name to see it shrink">
          <input
            className={inputCls}
            value={previewName}
            onChange={e => setPreviewName(e.target.value)}
            placeholder={SAMPLE_NAME}
          />
        </Field>
        <Field label="Name colour">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cert.color}
              onChange={e => onChange({ ...cert, color: e.target.value })}
              className="h-11 w-14 shrink-0 cursor-pointer rounded-xl border border-stone-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900"
              aria-label="Name colour"
            />
            <span className="text-sm tabular-nums text-stone-500">{cert.color}</span>
          </div>
        </Field>
        <Field label="Font">
          <select
            className={inputCls}
            value={cert.font}
            onChange={e => onChange({ ...cert, font: e.target.value as CertificateFont })}
          >
            {CERT_FONTS.map(f => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" leftIcon={ImageUp} isPending={uploading} onPress={onReplace}>
          Replace image
        </Button>
        <Button
          variant="secondary"
          leftIcon={Download}
          isDisabled={!image || !cert.box}
          onPress={downloadSample}
        >
          Download sample
        </Button>
        <Button
          variant="secondary"
          leftIcon={Eraser}
          isDisabled={!cert.box}
          onPress={() => onChange({ ...cert, box: null })}
        >
          Clear position
        </Button>
        <Button variant="secondary" leftIcon={Trash2} onPress={onRemove}>
          Remove certificate
        </Button>
      </div>
    </div>
  )
}
