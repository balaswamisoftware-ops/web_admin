import type { ComponentProps, ReactNode } from 'react'
import { Button as HeroButton } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './cn'

type HeroButtonProps = ComponentProps<typeof HeroButton>

export interface ButtonProps
  extends Omit<HeroButtonProps, 'className' | 'children'> {
  className?: string
  children?: ReactNode
  /** Optional lucide icon rendered before the label. */
  leftIcon?: LucideIcon
  /** Optional lucide icon rendered after the label. */
  rightIcon?: LucideIcon
}

/**
 * App button — thin wrapper over HeroUI v3's Button with our defaults and
 * convenient lucide icon slots. Variants: primary | secondary | tertiary |
 * outline | ghost | danger | danger-soft.
 */
export function Button({
  leftIcon: Left,
  rightIcon: Right,
  children,
  className,
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <HeroButton
      variant={variant}
      className={cn('inline-flex items-center gap-2 font-medium', className)}
      {...props}
    >
      {Left && <Left size={18} aria-hidden />}
      {children}
      {Right && <Right size={18} aria-hidden />}
    </HeroButton>
  )
}
