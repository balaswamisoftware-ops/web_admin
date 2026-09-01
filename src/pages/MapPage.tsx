import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import { Globe2, RefreshCw, MapPin, AlertCircle, Maximize2, Minimize2 } from 'lucide-react'
import { locationsService, type UserLocation } from '../services/locationsService'
import { RegionBreakdown, type Region } from '../components/map/RegionBreakdown'

// three-globe's own example textures — a photorealistic Earth + starfield.
const EARTH = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
const BUMP = 'https://unpkg.com/three-globe/example/img/earth-topology.png'
const SKY = 'https://unpkg.com/three-globe/example/img/night-sky.png'

export function MapPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeEl = useRef<any>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 800, h: 560 })
  const [points, setPoints] = useState<UserLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => {
    const node = wrapRef.current
    if (!node) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void node.requestFullscreen()
  }, [])

  /** Centre the globe on a region picked from the breakdown tree. */
  const flyTo = useCallback((r: Region) => {
    const g = globeEl.current
    if (!g) return
    // Stop the idle spin, or it would immediately drift off the chosen region.
    g.controls().autoRotate = false
    g.pointOfView({ lat: r.lat, lng: r.lng, altitude: 1.1 }, 1000)
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const load = () => {
    setLoading(true)
    setError(null)
    locationsService
      .list()
      .then(setPoints)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load locations.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // Keep the globe sized to its container.
  useEffect(() => {
    const node = wrapRef.current
    if (!node) return
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect
      setSize({ w: Math.max(320, r.width), h: Math.max(360, r.height) })
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  // Auto-rotate + a gentle starting viewpoint once the globe is mounted.
  useEffect(() => {
    const g = globeEl.current
    if (!g) return
    const controls = g.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controls.enableZoom = true
    // Clamp zoom so scrolling can't push the camera inside/through the globe
    // (radius is 100) or fling it off to infinity.
    controls.minDistance = 160
    controls.maxDistance = 500
    controls.zoomSpeed = 0.6
    g.pointOfView({ lat: 20, lng: 78, altitude: 2.6 }, 0)
  }, [loading])

  // Cluster identical coordinates only for the label count; points stay 1:1.
  const total = points.length
  const cities = useMemo(
    () => new Set(points.map(p => `${p.lat.toFixed(1)},${p.lng.toFixed(1)}`)).size,
    [points],
  )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
            <Globe2 size={22} />
          </span>
          <div>
            <div className="text-xl font-bold text-stone-900 dark:text-white">
              Devotees around the world
            </div>
            <div className="text-sm text-stone-500">
              {loading
                ? 'Loading…'
                : `${total.toLocaleString('en-IN')} devotee${total === 1 ? '' : 's'} · ${cities} place${cities === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200/70 text-stone-500 transition-colors hover:bg-stone-100 dark:border-white/10 dark:hover:bg-white/10"
          title="Refresh"
          aria-label="Refresh"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div
        ref={wrapRef}
        className={`relative overflow-hidden bg-black ${
          isFullscreen
            ? 'h-screen w-screen'
            : 'h-[68vh] rounded-3xl border border-stone-200/70 dark:border-white/10'
        }`}
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg bg-black/50 text-white/90 backdrop-blur transition-colors hover:bg-black/70"
        >
          {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        {!loading && total === 0 ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-stone-400">
            <MapPin size={28} />
            <p className="text-sm">No devotee has shared their location yet.</p>
          </div>
        ) : null}
        <Globe
          ref={globeEl}
          width={size.w}
          height={size.h}
          globeImageUrl={EARTH}
          bumpImageUrl={BUMP}
          backgroundImageUrl={SKY}
          pointsData={points}
          pointLat="lat"
          pointLng="lng"
          pointColor={() => '#f59e0b'}
          pointAltitude={0.03}
          pointRadius={0.35}
          pointLabel={(d: object) => {
            const p = d as UserLocation
            const where = [p.district, p.state, p.country].filter(Boolean).join(', ')
            return `<div style="font:600 12px sans-serif;color:#fff">${p.fullName}</div>${
              where ? `<div style="font:400 11px sans-serif;color:#cbd5e1">${where}</div>` : ''
            }`
          }}
          atmosphereColor="#7dd3fc"
          atmosphereAltitude={0.18}
        />
      </div>

        <RegionBreakdown points={points} onPick={flyTo} />
      </div>

      <p className="mt-3 text-center text-xs text-stone-400">
        Drag to rotate · scroll to zoom · hover a point for the devotee's name.
      </p>
    </div>
  )
}
