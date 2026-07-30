import { useId } from 'react'
import { cn } from './cn'

export interface BrandMarkProps {
  /** Pixel size of the square mark. */
  size?: number
  /** Extra classes for the wrapper (e.g. shadow, rounding is built in). */
  className?: string
}

/**
 * Sri Vidya Peetam brand mark — a lit diya (lamp) with a lotus base and a
 * flame, drawn in the saffron→maroon brand gradient. Replaces the plain emoji
 * so the logo stays crisp at every size and in both themes.
 */
export function BrandMark({ size = 40, className }: BrandMarkProps) {
  const id = useId()
  const bg = `bg-${id}`
  const flame = `flame-${id}`

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-2xl',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        role="img"
        aria-label="Sri Vidya Peetam"
        className="rounded-2xl"
      >
        <defs>
          <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0AD78" />
            <stop offset="45%" stopColor="#E8751A" />
            <stop offset="100%" stopColor="#7A1F1F" />
          </linearGradient>
          <linearGradient id={flame} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#FFF3D6" />
            <stop offset="55%" stopColor="#FFD24D" />
            <stop offset="100%" stopColor="#E8751A" />
          </linearGradient>
        </defs>

        {/* Rounded tile */}
        <rect width="48" height="48" rx="13" fill={`url(#${bg})`} />

        {/* Flame */}
        <path
          d="M24 9c2.6 3 4 5.4 4 8.1a4 4 0 0 1-8 0c0-1.2.5-2.4 1.4-3.6C20 15 19.3 16.7 19.3 18.4 19.3 22 21.4 24 24 24s4.7-2 4.7-5.6C28.7 14.4 26.7 11.2 24 9Z"
          fill={`url(#${flame})`}
        />

        {/* Lotus / lamp bowl */}
        <path
          d="M12 28h24c-.7 4.4-5.9 8-12 8s-11.3-3.6-12-8Z"
          fill="#FFFFFF"
          fillOpacity="0.92"
        />
        {/* Petal accents on the bowl */}
        <path
          d="M24 36c-6.1 0-11.3-3.6-12-8h4.2c.6 2.9 3.8 5.2 7.8 5.2S31.2 30.9 31.8 28H36c-.7 4.4-5.9 8-12 8Z"
          fill="#FFFFFF"
          fillOpacity="0.55"
        />
      </svg>
    </span>
  )
}
