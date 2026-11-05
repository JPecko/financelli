import { useState, useEffect, useMemo, forwardRef } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'
import MonthYearPicker, { type PickerView } from './MonthYearPicker'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  value: string                  // ISO 'YYYY-MM-DD'
  onChange: (v: string) => void
  id?: string
  className?: string
}

// ── Calendar classNames (Tailwind) ────────────────────────────────────────────

const cal = {
  root:          'w-full p-2 select-none',
  months:        'relative flex flex-col',
  month:         'w-full space-y-2',
  month_caption: 'flex justify-center items-center h-10',
  caption_label: 'text-sm font-semibold',
  caption_button: 'relative z-10 rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent',
  // The nav row overlays the caption, so only its buttons take clicks (the caption opens the month picker)
  nav: 'absolute top-0 inset-x-0 flex justify-between items-center h-10 px-1 pointer-events-none [&>button]:pointer-events-auto',
  button_previous: [
    'h-9 w-9 flex items-center justify-center rounded-md',
    'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  ].join(' '),
  button_next: [
    'h-9 w-9 flex items-center justify-center rounded-md',
    'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  ].join(' '),
  month_grid: 'w-full border-collapse',
  weekdays:   '',
  weekday:    'text-muted-foreground text-[0.72rem] font-medium text-center pb-1',
  week:       '',
  day:        'p-0.5 text-center',
  day_button: [
    'h-11 w-11 sm:h-10 sm:w-10 rounded-lg text-sm font-normal transition-colors',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'flex items-center justify-center mx-auto',
  ].join(' '),
  selected:    'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground rounded-lg',
  today:       'border border-primary/60 text-primary font-semibold',
  outside:     'text-muted-foreground/40',
  disabled:    'text-muted-foreground/25 pointer-events-none',
  hidden:      'invisible',
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 640 : false,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setMobile(mq.matches)
    const h = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return mobile
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

const Trigger = forwardRef<HTMLButtonElement, {
  value: string; id?: string; className?: string; onClick?: () => void
}>(({ value, id, className, onClick }, ref) => {
  const label = value ? format(parseISO(value), 'd MMM yyyy') : 'Select date'
  return (
    <button
      ref={ref}
      id={id}
      type="button"
      onClick={onClick}
      className={cn(
        'h-9 w-full flex items-center justify-between gap-2 px-3 rounded-md text-base',
        'bg-input border border-border text-foreground shadow-xs',
        'transition-[border-color,box-shadow] duration-150 outline-none',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20',
        !value && 'text-muted-foreground',
        className,
      )}
    >
      <span>{label}</span>
      <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
    </button>
  )
})

function Calendar({ value, onSelect }: { value: string; onSelect: (d: Date) => void }) {
  const selected = value ? parseISO(value) : undefined
  const [month, setMonth] = useState(() => selected ?? new Date())
  const [view, setView]   = useState<'days' | PickerView>('days')

  // Stable so DayPicker doesn't remount the caption on every render
  const components = useMemo(() => ({
    Chevron: ({ orientation }: { orientation?: string }) =>
      orientation === 'left'
        ? <ChevronLeftIcon className="size-4" />
        : <ChevronRightIcon className="size-4" />,
    CaptionLabel: ({ children }: { children?: React.ReactNode }) => (
      <button type="button" className={cal.caption_button} onClick={() => setView('months')}>{children}</button>
    ),
  }), [])

  if (view !== 'days') {
    return (
      <MonthYearPicker
        month={month}
        view={view}
        onView={setView}
        onPick={m => { setMonth(m); setView('days') }}
      />
    )
  }

  return (
    <DayPicker
      mode="single"
      selected={selected}
      onSelect={d => d && onSelect(d)}
      month={month}
      onMonthChange={setMonth}
      weekStartsOn={1}
      classNames={cal}
      components={components}
    />
  )
}

// ── DateInput ─────────────────────────────────────────────────────────────────

export default function DateInput({ value, onChange, id, className }: Props) {
  const [open, setOpen] = useState(false)
  const isMobile = useIsMobile()

  function handleSelect(day: Date) {
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  if (isMobile) {
    return (
      <>
        <Trigger value={value} id={id} className={className} onClick={() => setOpen(true)} />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" showCloseButton={false} className="pb-8 px-2">
            <SheetHeader className="pb-0">
              <SheetTitle className="text-center text-base">Select Date</SheetTitle>
            </SheetHeader>
            <Calendar value={value} onSelect={handleSelect} />
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Trigger value={value} id={id} className={className} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar value={value} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  )
}
