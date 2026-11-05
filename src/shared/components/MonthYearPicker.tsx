import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PickerView = 'months' | 'years'

interface Props {
  month:    Date                    // month currently shown by the calendar
  view:     PickerView
  onView:   (view: PickerView) => void
  onPick:   (month: Date) => void   // a month was chosen: back to the day grid
}

const YEARS_PER_PAGE = 12
const MONTHS = Array.from({ length: 12 }, (_, i) => i)

const cx = {
  root:   'w-full p-2 select-none sm:w-82',  // sm: same width as the day calendar, so the popover doesn't jump
  header: 'flex h-10 items-center justify-between px-1',
  nav:    'flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  title:  'rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent',
  grid:   'grid grid-cols-3 gap-1 pt-2',
  cell:   'h-12 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
  active: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
}

/** Month grid (click the year to switch to a year grid), shown in place of the day calendar. */
export default function MonthYearPicker({ month, view, onView, onPick }: Props) {
  const [year, setYear] = useState(month.getFullYear())
  const pageStart = year - (year % YEARS_PER_PAGE)
  const step      = view === 'months' ? 1 : YEARS_PER_PAGE

  const handleYear = (y: number) => {
    setYear(y)
    onView('months')
  }

  return (
    <div className={cx.root}>
      <div className={cx.header}>
        <button type="button" className={cx.nav} onClick={() => setYear(y => y - step)} aria-label="Previous">
          <ChevronLeftIcon className="size-4" />
        </button>
        {view === 'months'
          ? <button type="button" className={cx.title} onClick={() => onView('years')}>{year}</button>
          : <span className="text-sm font-semibold">{pageStart} – {pageStart + YEARS_PER_PAGE - 1}</span>}
        <button type="button" className={cx.nav} onClick={() => setYear(y => y + step)} aria-label="Next">
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      {view === 'months' ? (
        <div className={cx.grid}>
          {MONTHS.map(m => (
            <Cell key={m} active={year === month.getFullYear() && m === month.getMonth()} onClick={() => onPick(new Date(year, m, 1))}>
              {format(new Date(year, m, 1), 'MMM')}
            </Cell>
          ))}
        </div>
      ) : (
        <div className={cx.grid}>
          {Array.from({ length: YEARS_PER_PAGE }, (_, i) => pageStart + i).map(y => (
            <Cell key={y} active={y === month.getFullYear()} onClick={() => handleYear(y)}>{y}</Cell>
          ))}
        </div>
      )}
    </div>
  )
}

function Cell({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn(cx.cell, active && cx.active)}>{children}</button>
}
