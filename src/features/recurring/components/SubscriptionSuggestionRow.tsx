import { Plus, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import BalanceValue from '@/shared/components/BalanceValue'
import { getCategoryById } from '@/domain/categories'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { useT } from '@/shared/i18n'
import type { SubscriptionCandidate } from '@/domain/subscriptionDetection'

interface Props {
  item:        SubscriptionCandidate
  accountName: string
  onCreate:    () => void
  onDismiss:   () => void
}

export default function SubscriptionSuggestionRow({ item, accountName, onCreate, onDismiss }: Props) {
  const t    = useT()
  const cat  = getCategoryById(item.category)
  const Icon = cat.icon

  return (
    <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${cat.color}22` }}>
          <Icon className="h-4 w-4" style={{ color: cat.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.description}</p>
          <p className="truncate text-xs text-muted-foreground">
            {accountName} · {t(`recurring.frequencies.${item.frequency}`)} · {t('recurring.suggestions.seen', { count: String(item.occurrences), date: formatDate(item.lastDate) })}
          </p>
        </div>
        <BalanceValue>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
            {item.amountVaries && '~'}{formatMoney(Math.abs(item.amount))}
          </span>
        </BalanceValue>
      </div>
      <div className="flex gap-2 sm:shrink-0">
        <Button size="sm" variant="outline" className="h-9 flex-1 gap-1 sm:flex-none" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" /> {t('recurring.suggestions.create')}
        </Button>
        <Button size="sm" variant="ghost" className="h-9 gap-1 text-muted-foreground" onClick={onDismiss} aria-label={t('recurring.suggestions.dismiss')}>
          <X className="h-3.5 w-3.5" /> <span className="sm:hidden">{t('recurring.suggestions.dismiss')}</span>
        </Button>
      </div>
    </div>
  )
}
