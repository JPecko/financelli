import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PlainSelectOption {
  value: string
  label: string
  content?: ReactNode
  selectedContent?: ReactNode
  disabled?: boolean
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: PlainSelectOption[]
  placeholder?: string
  className?: string
}

const triggerClasses =
  'flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-input bg-background px-3.5 text-left text-base shadow-xs transition-[border-color,box-shadow,background-color] outline-none hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const panelClasses =
  'absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg'

const optionClasses =
  'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-accent/70 focus:bg-accent/70 focus:outline-none data-[selected=true]:bg-accent/70 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50'

export default function PlainSelect({
  value,
  onChange,
  options,
  placeholder = 'Select',
  className,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listId = useId()

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value],
  )

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className={cn(triggerClasses, !selectedOption && 'text-muted-foreground')}
        onClick={() => setOpen(prev => !prev)}
      >
        <div key={selectedOption?.value ?? 'placeholder'} className="min-w-0 flex-1">
          {selectedOption?.selectedContent ?? selectedOption?.content ?? selectedOption?.label ?? placeholder}
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className={panelClasses}>
          <div id={listId} role="listbox" className="max-h-72 overflow-y-auto p-1.5">
            {options.map(option => {
              const isSelected = option.value === value

              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  data-disabled={option.disabled || undefined}
                  disabled={option.disabled}
                  className={optionClasses}
                  onClick={() => handleSelect(option.value)}
                >
                  <div className="min-w-0 flex-1">{option.content ?? option.label}</div>
                  <Check className={cn('h-4 w-4 shrink-0 text-primary', !isSelected && 'invisible')} />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
