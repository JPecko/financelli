import { useState } from 'react'
import { SlidersHorizontal, Check, FilterX, Building2, Shapes } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { Separator } from '@/shared/components/ui/separator'
import BankLogo from '@/shared/components/BankLogo'
import { useT } from '@/shared/i18n'
import { BANK_OPTIONS } from '@/shared/config/banks'
import { getCategoryById, tCategory } from '@/domain/categories'
import type { Account } from '@/domain/types'

interface Props {
  accounts:          Account[]
  categoriesInMonth: string[]
  filterAccountId:   number | null
  filterCategory:    string | null
  filterSource:      'all' | 'bank' | 'shared'
  activeFilterCount: number
  setFilterAccountId: (id: number | null) => void
  setFilterCategory:  (cat: string | null) => void
  setFilterSource:    (src: 'all' | 'bank' | 'shared') => void
  clearFilters:       () => void
}

export default function TransactionFilterPopover({
  accounts,
  categoriesInMonth,
  filterAccountId,
  filterCategory,
  filterSource,
  activeFilterCount,
  setFilterAccountId,
  setFilterCategory,
  setFilterSource,
  clearFilters,
}: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)

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
        className="w-[min(340px,_calc(100vw-1.5rem))] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">{t('transactions.filters')}</p>
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              {t('transactions.clearFilters')}
            </button>
          )}
        </div>

        <Separator />

        {/* Source */}
        <div className="pt-3 pb-3">
          <p className="pb-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Source
          </p>
          <div className="flex gap-2 px-4">
            {(['all', 'bank', 'shared'] as const).map(src => {
              const label = src === 'all'  ? t('sharedExpenses.filterAll')
                          : src === 'bank' ? t('sharedExpenses.filterBank')
                          : t('sharedExpenses.filterLabel')
              return (
                <button
                  key={src}
                  onClick={() => setFilterSource(src)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors text-center ${
                    filterSource === src ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Account */}
        <div className="pt-3 pb-1">
          <p className="pb-1 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('transactions.colAccount')}
          </p>
          <div className="relative">
            <div className="max-h-44 overflow-y-auto">
              <FilterRow
                icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                label={t('transactions.allAccounts')}
                selected={filterAccountId === null}
                onClick={() => setFilterAccountId(null)}
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
                    onClick={() => setFilterAccountId(acc.id!)}
                  />
                )
              })}
            </div>
            <FadeGradient />
          </div>
        </div>

        <Separator />

        {/* Category */}
        <div className="pt-3 pb-1">
          <p className="pb-1 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('transactions.colCategory')}
          </p>
          <div className="relative">
            <div className="max-h-44 overflow-y-auto">
              <FilterRow
                icon={<Shapes className="h-4 w-4 text-muted-foreground" />}
                label={t('transactions.allCategories')}
                selected={filterCategory === null}
                onClick={() => setFilterCategory(null)}
              />
              {categoriesInMonth.map(catId => {
                const cat = getCategoryById(catId)
                const CatIcon = cat.icon
                return (
                  <FilterRow
                    key={catId}
                    icon={
                      <div
                        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <CatIcon className="h-4 w-4" style={{ color: cat.color }} />
                      </div>
                    }
                    label={tCategory(cat.id, t)}
                    selected={filterCategory === catId}
                    onClick={() => setFilterCategory(catId)}
                    noIconWrapper
                  />
                )
              })}
              {categoriesInMonth.length === 0 && (
                <p className="px-4 py-3 text-sm text-muted-foreground">{t('common.noData')}</p>
              )}
            </div>
            <FadeGradient />
          </div>
        </div>

        <Separator />

        {/* Apply */}
        <div className="px-4 py-3">
          <Button className="w-full" size="sm" onClick={() => setOpen(false)}>
            {t('transactions.applyFilters')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

interface FilterRowProps {
  icon:        React.ReactNode
  label:       string
  sublabel?:   string
  selected:    boolean
  onClick:     () => void
  noIconWrapper?: boolean
}

function FilterRow({ icon, label, sublabel, selected, onClick, noIconWrapper }: FilterRowProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left ${selected ? 'bg-accent' : ''}`}
    >
      {noIconWrapper ? icon : (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
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
