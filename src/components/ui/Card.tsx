import type { ComponentProps, ReactNode } from 'react'
import {
  Card as HeroCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@heroui/react'
import type { LucideIcon } from 'lucide-react'

type HeroCardProps = ComponentProps<typeof HeroCard>

export interface AppCardProps extends HeroCardProps {
  title?: string
  subtitle?: string
  /** Optional lucide icon shown in the header. */
  icon?: LucideIcon
  footer?: ReactNode
}

/**
 * App card — HeroUI v3 Card with an opinionated header/content/footer layout.
 * Pass `title`/`subtitle`/`icon` for the standard header, or just use
 * children for a plain body.
 */
export function Card({
  title,
  subtitle,
  icon: Icon,
  footer,
  children,
  className,
  ...props
}: AppCardProps) {
  const hasHeader = Boolean(title || subtitle || Icon)

  return (
    <HeroCard className={className} {...props}>
      {hasHeader && (
        <CardHeader className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
              <Icon size={18} aria-hidden />
            </span>
          )}
          <div className="flex flex-col text-left">
            {title && <CardTitle>{title}</CardTitle>}
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>
        </CardHeader>
      )}
      <CardContent className="text-left">{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </HeroCard>
  )
}
