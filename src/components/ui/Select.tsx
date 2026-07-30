import { Select as HeroSelect, Label, ListBox } from '@heroui/react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './cn'

export interface AppSelectProps {
  label?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  /** Optional lucide icon rendered inside the trigger, on the left. */
  icon?: LucideIcon
  className?: string
}

/**
 * App select — HeroUI v3 Select with a label and an optional lucide icon.
 * Renders a styled popover listbox (not the native browser dropdown). Bind
 * `value`/`onChange` with plain strings; empty string means "nothing selected".
 */
export function Select({
  label,
  placeholder = 'Select…',
  value,
  onChange,
  options,
  icon: Icon,
  className,
}: AppSelectProps) {
  return (
    <HeroSelect
      className={cn('flex flex-col gap-1.5', className)}
      placeholder={placeholder}
      selectedKey={value || null}
      onSelectionChange={key => onChange(key == null ? '' : String(key))}
    >
      {label && <Label>{label}</Label>}
      <HeroSelect.Trigger>
        {Icon && (
          <Icon size={18} className="shrink-0 text-gray-400" aria-hidden />
        )}
        <HeroSelect.Value className="flex-1 text-left" />
        <HeroSelect.Indicator />
      </HeroSelect.Trigger>
      <HeroSelect.Popover>
        <ListBox>
          {options.map(opt => (
            <ListBox.Item key={opt} id={opt} textValue={opt}>
              {opt}
            </ListBox.Item>
          ))}
        </ListBox>
      </HeroSelect.Popover>
    </HeroSelect>
  )
}
