import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { formatMoney } from '@/domain/money'
import { formatDate } from '@/shared/utils/format'
import { getCategoryById, tCategory } from '@/domain/categories'
import { useT } from '@/shared/i18n'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import { ListRow } from '../utils/dashboardHelpers'
import type { TopExpenseItem } from '../hooks/useDashboardModel'

interface Props {
  topExpenses: TopExpenseItem[]
  hasBenefits: boolean
}

export default function TopExpensesCard({ topExpenses, hasBenefits }: Props) {
  const t = useT()

  return (
    <Card className={!hasBenefits ? 'lg:col-span-2' : ''}>
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">{t('dashboard.topExpenses')}</CardTitle>
          <PageHelpInfo title={t('dashboard.sections.topExpenses.title')} body={t('dashboard.sections.topExpenses.body')} />
        </div>
      </CardHeader>
      <CardContent>
        {topExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.noExpenses')}</p>
        ) : (
          <div className="divide-y divide-border">
            {topExpenses.map(item => {
              const cat = getCategoryById(item.category)
              return (
                <ListRow
                  key={item.key}
                  icon={<span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />}
                  label={item.description || tCategory(cat.id, t)}
                  sublabel={item.sublabel
                    ? `${item.sublabel} · ${formatDate(item.date)}`
                    : `${tCategory(cat.id, t)} · ${formatDate(item.date)}`}
                  value={
                    <span className="text-sm font-semibold text-rose-600 tabular-nums">
                      {formatMoney(Math.abs(item.amount))}
                    </span>
                  }
                />
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
