import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { useLanguageStore } from '@/shared/store/languageStore'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import { formatMonthYear } from '@/shared/utils/format'
import { cn } from '@/lib/utils'
import BalanceValue from '@/shared/components/BalanceValue'
import { GOAL_TEXT } from '../utils/goalStatusStyles'
import type { Locale } from 'date-fns'
import type { GoalProgress } from '@/domain/savingsGoals'

const money = (cents: number) => formatMoney(Math.round(cents))

/** One-line forecast: amount needed per month for dated goals, estimated finish date otherwise. */
export default function GoalHint({ row, className }: { row: GoalProgress; className?: string }) {
  const t      = useT()
  const locale = getDateFnsLocale(useLanguageStore(s => s.lang))
  return (
    <BalanceValue>
      <p className={cn('text-xs', GOAL_TEXT[row.status], className)}>{hintText(row, t, locale)}</p>
    </BalanceValue>
  )
}

function hintText(row: GoalProgress, t: ReturnType<typeof useT>, locale: Locale) {
  const { goal, status, pace } = row
  if (row.isForecast) {
    const forecast = t('goals.forecast', { date: formatMonthYear(goal.targetDate!, locale), amount: money(row.target) })
    return pace != null ? `${forecast} · ${t('goals.pace', { amount: money(pace) })}${growthSuffix(row, t)}` : forecast
  }
  if (status === 'reached') return t('goals.reached')
  if (goal.targetDate) {
    const date = formatMonthYear(goal.targetDate, locale)
    if (row.monthsLeft === 0) return t('goals.overdue', { date })
    const needed = t('goals.needed', { amount: money(row.requiredMonthly ?? 0), date })
    return pace != null ? `${needed} · ${t('goals.pace', { amount: money(pace) })}${growthSuffix(row, t)}` : needed
  }
  if (row.etaDate) return t('goals.eta', { date: formatMonthYear(row.etaDate, locale), amount: money(pace ?? 0) }) + growthSuffix(row, t)
  return pace == null ? t('goals.noHistory') : t('goals.notGrowing')
}

function growthSuffix(row: GoalProgress, t: ReturnType<typeof useT>) {
  if (row.growthPct == null) return ''
  return ` · ${t('goals.growth', { pct: row.growthPct.toFixed(1) })}`
}
