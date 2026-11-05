import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import BalanceValue from '@/shared/components/BalanceValue'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import SubscriptionSuggestionRow from './SubscriptionSuggestionRow'
import type { SubscriptionCandidate } from '@/domain/subscriptionDetection'

// The rest stays behind "Show all" so the rules list remains the page's focus
const COLLAPSED_COUNT = 3

interface Props {
  suggestions:  SubscriptionCandidate[]
  monthlyTotal: number
  accountName:  (id: number) => string
  onCreate:     (item: SubscriptionCandidate) => void
  onDismiss:    (item: SubscriptionCandidate) => void
}

export default function SubscriptionSuggestions({ suggestions, monthlyTotal, accountName, onCreate, onDismiss }: Props) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  if (suggestions.length === 0) return null

  const visible = expanded ? suggestions : suggestions.slice(0, COLLAPSED_COUNT)
  const hidden  = suggestions.length - visible.length

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-primary/30 bg-primary/5">
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-semibold">{t('recurring.suggestions.title', { count: String(suggestions.length) })}</h2>
            <PageHelpInfo title={t('recurring.suggestions.help.title')} body={t('recurring.suggestions.help.body')} />
          </div>
          <BalanceValue>
            <p className="text-xs text-muted-foreground">{t('recurring.suggestions.subtitle', { amount: formatMoney(monthlyTotal) })}</p>
          </BalanceValue>
        </div>
      </div>
      <div className="divide-y divide-border bg-background">
        {visible.map(item => (
          <SubscriptionSuggestionRow
            key={item.key}
            item={item}
            accountName={accountName(item.accountId)}
            onCreate={() => onCreate(item)}
            onDismiss={() => onDismiss(item)}
          />
        ))}
      </div>
      {(hidden > 0 || expanded) && (
        <Button variant="ghost" size="sm" className="h-10 w-full rounded-none text-xs" onClick={() => setExpanded(e => !e)}>
          {expanded ? t('recurring.suggestions.showLess') : t('recurring.suggestions.showAll', { count: String(suggestions.length) })}
        </Button>
      )}
    </section>
  )
}
