import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PlainSelectOption {
  value: string
  label: string
  content?: ReactNode
  selectedContent?: ReactNode
  disabled?: boolean
  /** Renders a section heading with a divider above this option (e.g. "Savings", "Investment"). */
  groupLabel?: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: PlainSelectOption[]
  placeholder?: string
  className?: string
}

const triggerClasses =
  'flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 text-left text-base shadow-xs transition-[border-color,box-shadow,background-color] outline-none hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

const panelClasses =
  'fixed z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-lg'

const PANEL_GAP = 8
const PANEL_MAX_HEIGHT = 288

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
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number; maxHeight: number }>()
  const rootRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const listId = useId()
  const [portalTarget, setPortalTarget] = useState<Element>(document.body)

  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value],
  )

  // Positioned via a portal + fixed coords (from the trigger's own rect) so the panel can't be
  // clipped by an ancestor's overflow-y-auto (e.g. a scrolling Dialog) — see feedback_plainselect_portal.
  // Radix Dialog sets pointer-events:none on the rest of <body> while open, so a plain
  // document.body portal is visible but unclickable — portal into the dialog content instead,
  // and position relative to it (its own transform makes `fixed` act like `absolute` there).
  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const dialogContent = triggerRef.current?.closest('[data-slot="dialog-content"]')
    setPortalTarget(dialogContent ?? document.body)
    const containerRect = dialogContent?.getBoundingClientRect()
    const offsetLeft = containerRect?.left ?? 0
    const offsetTop = containerRect?.top ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - PANEL_GAP
    const spaceAbove = rect.top - PANEL_GAP
    const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow
    const maxHeight = Math.min(PANEL_MAX_HEIGHT, Math.max(openAbove ? spaceAbove : spaceBelow, 120))
    setPanelStyle({
      left: rect.left - offsetLeft,
      width: rect.width,
      maxHeight,
      top: (openAbove ? rect.top - PANEL_GAP - maxHeight : rect.bottom + PANEL_GAP) - offsetTop,
    })
  }

  useLayoutEffect(() => {
    if (!open) return
    updatePosition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
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
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
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

      {open && panelStyle && createPortal(
        <div
          ref={panelRef}
          className={cn(panelClasses, portalTarget !== document.body && 'absolute')}
          style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
        >
          <div id={listId} role="listbox" className="overflow-y-auto p-1.5" style={{ maxHeight: panelStyle.maxHeight }}>
            {options.map((option, i) => {
              const isSelected = option.value === value

              return (
                <div key={option.value}>
                  {option.groupLabel && (
                    <div className={cn('px-3.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground', i > 0 && 'mt-1 border-t border-border')}>
                      {option.groupLabel}
                    </div>
                  )}
                  <button
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
                </div>
              )
            })}
          </div>
        </div>,
        portalTarget,
      )}
    </div>
  )
}
