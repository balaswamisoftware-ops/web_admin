import type { ComponentProps } from 'react'
import {
  TextField,
  Label,
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
} from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
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
          type={type}
          autoComplete={autoComplete}
        />
      </InputGroup>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </TextField>
  )
}
