import type { CertificateBox, CertificateFont, LevelCertificate } from '../types/mission'

/**
 * Chant-level certificates: parsing the stored config, and drawing a devotee's
 * name onto the template.
 *
 * THE FIT RULE (keep the mobile app's renderer identical to this):
 *   1. Start from a font size of 80% of the box height.
 *   2. Measure the name at that size. If it is wider than the box, scale the
 *      size down in proportion — text width grows linearly with font size, so
 *      one step lands exactly on "fills the box width".
 *   3. Never go below MIN_FONT_PX.
 *   4. Draw it centred in the box, horizontally and vertically.
 * A short name therefore prints at full height; a long one shrinks to fit.
 */

export const MIN_FONT_PX = 8

/** Starting size as a share of the box height, before shrinking to the width. */
const HEIGHT_RATIO = 0.8

export const DEFAULT_CERT_COLOR = '#1f2937'
export const DEFAULT_CERT_FONT: CertificateFont = 'serif'

export const CERT_FONTS: { value: CertificateFont; label: string }[] = [
  { value: 'serif', label: 'Serif (classic)' },
  { value: 'sans', label: 'Sans-serif (modern)' },
]

/** CSS font stack for a certificate font choice. */
export function fontStack(font: CertificateFont): string {
  return font === 'sans'
    ? 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif'
    : 'Georgia, "Times New Roman", "Noto Serif", serif'
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

function parseBox(raw: unknown): CertificateBox | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const x = Number(b.x)
  const y = Number(b.y)
  const w = Number(b.w)
  const h = Number(b.h)
  if (![x, y, w, h].every(Number.isFinite)) return null
  const box = { x: clamp01(x), y: clamp01(y), w: clamp01(w), h: clamp01(h) }
  // A box with no area, or one spilling off the image, is unusable.
  if (box.w <= 0 || box.h <= 0 || box.x + box.w > 1.0001 || box.y + box.h > 1.0001) return null
  return box
}

/** Coerce a stored `certificate` value; anything unusable becomes null. */
export function parseCertificate(raw: unknown): LevelCertificate | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>
  const imageUrl = typeof c.imageUrl === 'string' ? c.imageUrl.trim() : ''
  const width = Math.floor(Number(c.width))
  const height = Math.floor(Number(c.height))
  if (!imageUrl || !(width > 0) || !(height > 0)) return null
  const color =
    typeof c.color === 'string' && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : DEFAULT_CERT_COLOR
  const font: CertificateFont = c.font === 'sans' ? 'sans' : 'serif'
  return { imageUrl, width, height, box: parseBox(c.box), color, font }
}

/** Ready to hand out: an image AND a marked name position. */
export function isCertificateComplete(c: LevelCertificate | null | undefined): boolean {
  return !!c && !!c.imageUrl && !!c.box
}

/**
 * The font size (in image pixels) that makes `name` fill the box without
 * overflowing it. See THE FIT RULE above.
 */
export function fitFontSize(
  ctx: CanvasRenderingContext2D,
  name: string,
  font: CertificateFont,
  boxWidthPx: number,
  boxHeightPx: number,
): number {
  const start = Math.max(MIN_FONT_PX, boxHeightPx * HEIGHT_RATIO)
  ctx.font = `600 ${start}px ${fontStack(font)}`
  const measured = ctx.measureText(name).width
  const size = measured > boxWidthPx && measured > 0 ? start * (boxWidthPx / measured) : start
  return Math.max(MIN_FONT_PX, Math.floor(size))
}

/**
 * Render a certificate at the template's full resolution: the image, then the
 * name fitted into the box. The canvas is resized to the image's natural size.
 */
export function drawCertificate(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  cert: LevelCertificate,
  name: string,
): void {
  const w = image.naturalWidth || cert.width
  const h = image.naturalHeight || cert.height
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(image, 0, 0, w, h)

  const text = name.trim()
  if (!cert.box || !text) return

  const bx = cert.box.x * w
  const by = cert.box.y * h
  const bw = cert.box.w * w
  const bh = cert.box.h * h
  const size = fitFontSize(ctx, text, cert.font, bw, bh)

  ctx.font = `600 ${size}px ${fontStack(cert.font)}`
  ctx.fillStyle = cert.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, bx + bw / 2, by + bh / 2)
}
