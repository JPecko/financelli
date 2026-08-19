import { useState } from 'react'
import { SlidersHorizontal, Check, FilterX, Building2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Separator } from '@/shared/components/ui/separator'
import BankLogo from '@/shared/components/BankLogo'
import { useT } from '@/shared/i18n'
import { BANK_OPTIONS } from '@/shared/config/banks'
import type { Account } from '@/domain/types'

interface Props {
  accounts:           Account[]
  filterAccountId:    number | null
  setFilterAccountId: (id: number | null) => void
}

export default function RecurringFilterPopover({ accounts, filterAccountId, setFilterAccountId }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const activeFilterCount = filterAccountId != null ? 1 : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={activeFilterCount > 0 ? 'secondary' : 'outline'}
          size="sm"
          className="gap-2 h-9 px-3"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="text-sm">{t('transactions.filters')}</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(320px,_calc(100vw-1.5rem))] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">{t('transactions.filters')}</p>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilterAccountId(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              {t('transactions.clearFilters')}
            </button>
          )}
        </div>

        <Separator />

        <div className="pt-3 pb-1">
          <p className="pb-1 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('transactions.colAccount')}
          </p>
          <div className="relative">
            <div className="max-h-60 overflow-y-auto">
              <FilterRow
                icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                label={t('transactions.allAccounts')}
                selected={filterAccountId === null}
                onClick={() => { setFilterAccountId(null); setOpen(false) }}
              />
              {accounts.map(acc => {
                const bank = acc.bankCode ? BANK_OPTIONS.find(b => b.code === acc.bankCode) : undefined
                return (
                  <FilterRow
                    key={acc.id}
                    icon={
                      bank ? (
                        <BankLogo
                          domain={bank.logoDomain}
                          name={bank.name}
                          accountType={acc.type}
                          imgClassName="h-5 w-5 object-contain"
                          iconClassName="h-4 w-4 text-muted-foreground"
                        />
                      ) : (
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: acc.color }} />
                      )
                    }
                    label={acc.name}
                    sublabel={bank?.name}
                    selected={filterAccountId === acc.id}
                    onClick={() => { setFilterAccountId(acc.id!); setOpen(false) }}
                  />
                )
              })}
            </div>
            <FadeGradient />
          </div>
        </div>

        <Separator />

        <div className="px-4 py-3">
          <Button className="w-full" size="sm" onClick={() => setOpen(false)}>
            {t('transactions.applyFilters')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface FilterRowProps {
  icon:      React.ReactNode
  label:     string
  sublabel?: string
  selected:  boolean
  onClick:   () => void
}

function FilterRow({ icon, label, sublabel, selected, onClick }: FilterRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${selected ? 'bg-accent' : ''}`}
    >
      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground truncate">{sublabel}</p>}
      </div>
      {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
    </button>
  )
}

function FadeGradient() {
  return (
    <div className="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-popover to-transparent" />
  )
}
