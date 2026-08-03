import { useState, type ComponentProps } from 'react'
import {
  TextField,
  Label,
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
  InputGroupSuffix,
} from '@heroui/react'
import { Eye, EyeOff, type LucideIcon } from 'lucide-react'
import { cn } from './cn'

type TextFieldProps = ComponentProps<typeof TextField>

export interface InputProps
  extends Omit<TextFieldProps, 'className' | 'children'> {
  className?: string
  label?: string
  placeholder?: string
  /** HTML input type forwarded to the field (e.g. "password", "email"). */
  type?: string
  autoComplete?: string
  /** Optional helper text shown below the field. */
  description?: string
  /** Optional lucide icon rendered inside the field, on the left. */
  icon?: LucideIcon
}

/**
 * App input — HeroUI v3 TextField + InputGroup with a label and an optional
 * lucide icon. Bind `value`/`onChange` on this component (react-aria passes
 * the string value to onChange).
 *
 * When `type="password"`, a show/hide eye button is rendered on the right that
 * toggles the field between masked and plain text.
 */
export function Input({
  label,
  placeholder,
  type,
  autoComplete,
  description,
  icon: Icon,
  className,
  ...props
}: InputProps) {
  const isPassword = type === 'password'
  const [revealed, setRevealed] = useState(false)
  // For password fields, swap to "text" when revealed so the value is visible.
  const effectiveType = isPassword ? (revealed ? 'text' : 'password') : type

  return (
    <TextField className={cn('flex flex-col gap-1.5', className)} {...props}>
      {label && <Label>{label}</Label>}
      <InputGroup>
        {Icon && (
          <InputGroupPrefix>
            <Icon size={18} className="text-gray-400" aria-hidden />
          </InputGroupPrefix>
        )}
        <InputGroupInput
          placeholder={placeholder}
          type={effectiveType}
          autoComplete={autoComplete}
        />
        {isPassword && (
          <InputGroupSuffix>
            <button
              type="button"
              // Keep it out of the tab order after the input for a natural flow,
              // but still reachable and screen-reader labelled.
              onClick={() => setRevealed(v => !v)}
              aria-label={revealed ? 'Hide password' : 'Show password'}
              aria-pressed={revealed}
              className="flex items-center justify-center rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:hover:text-gray-200"
            >
              {revealed ? (
                <EyeOff size={18} aria-hidden />
              ) : (
                <Eye size={18} aria-hidden />
              )}
            </button>
          </InputGroupSuffix>
        )}
      </InputGroup>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </TextField>
  )
}
