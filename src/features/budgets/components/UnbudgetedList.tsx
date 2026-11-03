import { Plus } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { getCategoryById, tCategory } from '@/domain/categories'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import BalanceValue from '@/shared/components/BalanceValue'

interface Props {
  items: { category: string; spent: number }[]
  onAdd: (category: string) => void
}

export default function UnbudgetedList({ items, onAdd }: Props) {
  const t = useT()
  if (items.length === 0) return null

  return (
    <section className="space-y-2">
      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('budgets.unbudgeted')}</p>
      <div className="divide-y divide-border rounded-lg border">
        {items.map(({ category, spent }) => {
          const cat  = getCategoryById(category)
          const Icon = cat.icon
          return (
            <div key={category} className="flex items-center gap-3 px-4 py-2.5">
              <Icon className="h-4 w-4 shrink-0" style={{ color: cat.color }} />
              <span className="min-w-0 flex-1 truncate text-sm">{tCategory(category, t)}</span>
              <BalanceValue><span className="text-sm tabular-nums text-muted-foreground">{formatMoney(spent)}</span></BalanceValue>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => onAdd(category)}>
                <Plus className="h-3.5 w-3.5" /> {t('budgets.set')}
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
