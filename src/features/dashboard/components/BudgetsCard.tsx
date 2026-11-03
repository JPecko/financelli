import { Link } from 'react-router-dom'
import { ChevronRight, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { getCategoryById, tCategory } from '@/domain/categories'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { cn } from '@/lib/utils'
import BalanceValue from '@/shared/components/BalanceValue'
import BudgetProgressBar from '@/features/budgets/components/BudgetProgressBar'
import { STATUS_TEXT } from '@/features/budgets/utils/budgetStatusStyles'
import { useBudgetOverview } from '@/features/budgets/hooks/useBudgetOverview'
import type { BudgetRowData } from '@/domain/budgets'

const now = new Date()
const CURRENT = { year: now.getFullYear(), month: now.getMonth() + 1 }
// Below lg only the tightest budgets are shown; desktop shows them all
const MOBILE_COUNT = 5

export default function BudgetsCard({ className }: { className?: string }) {
  const t = useT()
  const { rows, summary, isLoading } = useBudgetOverview(CURRENT)
  if (isLoading) return null

  const hiddenOnMobile = Math.max(rows.length - MOBILE_COUNT, 0)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{t('budgets.title')}</CardTitle>
        <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs">
          <Link to="/budgets">{rows.length > 0 ? t('budgets.seeAll') : t('budgets.addFirst')} <ChevronRight className="h-3.5 w-3.5" /></Link>
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Target className="h-5 w-5 shrink-0" />
            <p>{t('budgets.cardEmpty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-end justify-between gap-2">
                <BalanceValue>
                  <p className="tabular-nums">
                    <span className="text-xl font-bold">{formatMoney(summary.spent)}</span>
                    <span className="text-sm text-muted-foreground"> {t('budgets.of')} {formatMoney(summary.limit)}</span>
                  </p>
                </BalanceValue>
                <span className={`font-semibold tabular-nums ${STATUS_TEXT[summary.status]}`}>{summary.pct}%</span>
              </div>
              <BudgetProgressBar pct={summary.pct} status={summary.status} markerPct={summary.elapsedPct} className="h-2.5" />
            </div>

            <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row, i) => (
                <BudgetItem key={row.budget.category} row={row} markerPct={summary.elapsedPct} className={i >= MOBILE_COUNT ? 'hidden lg:block' : undefined} />
              ))}
            </ul>

            {hiddenOnMobile > 0 && (
              <p className="text-xs text-muted-foreground lg:hidden">{t('budgets.moreCount', { count: String(hiddenOnMobile) })}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BudgetItem({ row, markerPct, className }: { row: BudgetRowData; markerPct: number | null; className?: string }) {
  const t   = useT()
  const cat = getCategoryById(row.budget.category)
  return (
    <li className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
          <span className="truncate">{tCategory(cat.id, t)}</span>
        </span>
        <BalanceValue>
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">
            {formatMoney(row.spent)} / {formatMoney(row.budget.amountCents)}
            <span className={`ml-2 font-medium ${STATUS_TEXT[row.status]}`}>{row.pct}%</span>
          </span>
        </BalanceValue>
      </div>
      <BudgetProgressBar pct={row.pct} status={row.status} markerPct={markerPct} />
    </li>
  )
}
