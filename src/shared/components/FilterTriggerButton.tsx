import type { ComponentProps } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/lib/utils'
import { useT } from '@/shared/i18n'

interface Props extends ComponentProps<typeof Button> {
  activeCount: number
}

// While the popover is open (Radix sets data-state="open") the trigger turns primary, in both themes;
// the dark: hover repeats it because the outline variant's dark:hover:bg-secondary-hover would win
const openCls = 'group data-[state=open]:border-primary data-[state=open]:bg-primary data-[state=open]:text-primary-foreground data-[state=open]:hover:bg-primary-hover dark:data-[state=open]:hover:bg-primary-hover data-[state=open]:hover:text-primary-foreground'
const badgeOpenCls = 'group-data-[state=open]:bg-primary-foreground group-data-[state=open]:text-primary'

// Spreads props so PopoverTrigger asChild can pass its ref and handlers through (React 19 ref-as-prop)
export default function FilterTriggerButton({ activeCount, className, ...props }: Props) {
  const t = useT()

  return (
    <Button
      variant={activeCount > 0 ? 'secondary' : 'outline'}
      size="sm"
      className={cn('gap-2 h-9 px-3', openCls, className)}
      {...props}
    >
      <SlidersHorizontal className="h-4 w-4" />
      <span className="text-sm">{t('transactions.filters')}</span>
      {activeCount > 0 && (
        <span className={cn('flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold', badgeOpenCls)}>
          {activeCount}
        </span>
      )}
    </Button>
  )
}
