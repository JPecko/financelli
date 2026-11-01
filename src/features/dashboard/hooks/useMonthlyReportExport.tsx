import { useState } from 'react'
import { format, getYear, getMonth } from 'date-fns'
import { useDashboardModel } from './useDashboardModel'
import { useNetWorthHistory } from './useNetWorthHistory'
import { useT } from '@/shared/i18n'
import { useLanguageStore } from '@/shared/store/languageStore'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import { tCategory } from '@/domain/categories'
import { buildNetWorthEvolution, buildReportAccounts, groupReportAccountsByType } from '../utils/reportNetWorth'
import type { MonthlyReportData } from '../pdf/monthlyReport.types'

const now = new Date()
const EVOLUTION_MONTHS = 6

function isCurrentMonth(year: number, month: number) {
  return year === getYear(now) && month === getMonth(now) + 1
}

// If exporting the current month, compare against the previous month; otherwise compare against now.
function getComparisonPeriod(year: number, month: number) {
  if (!isCurrentMonth(year, month)) return { year: getYear(now), month: getMonth(now) + 1 }
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year
  return { year: prevYear, month: prevMonth }
}

export function useMonthlyReportExport(year: number, month: number) {
  const t = useT()
  const locale = getDateFnsLocale(useLanguageStore(s => s.lang))
  const model = useDashboardModel(year, month)
  const comparison = getComparisonPeriod(year, month)

  // Cash accounts are reconstructed from transactions; investments come from their month-end snapshot
  const history = useNetWorthHistory(model.accounts, model.effectiveBalances, { year, month }, EVOLUTION_MONTHS + 1)
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = async () => {
    setIsGenerating(true)
    try {
      const monthLabel      = format(new Date(year, month - 1), 'MMMM yyyy', { locale })
      const comparisonLabel = format(new Date(comparison.year, comparison.month - 1), 'MMMM yyyy', { locale })
      const isCurrent        = isCurrentMonth(year, month)
      const months           = history.months
      const target           = months[months.length - 1]
      // Current month compares with the previous month-end; a past month compares with today
      const comparisonBalances = isCurrent ? months[months.length - 2]?.balances : model.effectiveBalances

      const accounts = buildReportAccounts(
        model.accounts,
        target?.balances ?? {},
        comparisonBalances,
        a => t(('accounts.types.' + a.type) as Parameters<typeof t>[0]),
      )
      const netWorthByType = groupReportAccountsByType(accounts)
      const netWorthTotal  = accounts.reduce((sum, a) => sum + a.balance, 0)
      const netWorthDelta  = accounts.reduce((sum, a) => sum + (a.delta ?? 0), 0)

      const categories = model.categoryData.map(c => ({
        name:  c.name,
        color: c.color,
        value: c.value,
        pct:   model.categoryTotal > 0 ? Math.round((c.value / model.categoryTotal) * 100) : 0,
      }))

      const data: MonthlyReportData = {
        monthLabel,
        isCurrentMonth: isCurrent,
        income:        model.summary.personalIncome,
        expenses:      model.summary.personalExpenses,
        balance:       model.summary.personalBalance,
        savingsRate:   model.savingsRate,
        categories,
        categoryTotal: model.categoryTotal,
        accounts,
        netWorthTotal,
        netWorthByType,
        netWorthMissingInvestments: target?.missingInvestments ?? false,
        netWorthEstimatedInvestments: target?.estimatedInvestments ?? false,
        netWorthEvolution: buildNetWorthEvolution(months, locale),
        comparisonLabel,
        netWorthDelta,
        investment:    model.investmentSummary,
        topExpenses:   model.topExpenses.slice(0, 5).map(e => ({
          description: e.description,
          category:    tCategory(e.category, t),
          amount:      Math.abs(e.amount),
        })),
        labels: {
          title:               t('dashboard.report.title'),
          subtitle:            isCurrent
            ? t('dashboard.report.subtitleCurrent', { month: monthLabel })
            : t('dashboard.report.subtitlePast', { month: monthLabel }),
          income:              t('dashboard.income'),
          expenses:            t('dashboard.expenses'),
          balance:             t('dashboard.balance'),
          savingsRate:         t('dashboard.savingsRate'),
          spendingByCategory:  t('dashboard.spendingByCategory'),
          topExpenses:         t('dashboard.topExpenses'),
          netWorthByType:      t('dashboard.report.netWorthByType'),
          total:               t('dashboard.total'),
          excludesInvestments: t('dashboard.report.excludesInvestments'),
          netWorthEvolution:   t('dashboard.report.netWorthEvolution'),
          partialMonthNote:    t('dashboard.report.partialMonthNote'),
          estimatedMonthNote:  t('dashboard.report.estimatedMonthNote'),
          accountBalances:     t('dashboard.accountBalances'),
          investmentsSnapshot: t('dashboard.report.investmentsSnapshot'),
          investmentsNote:     isCurrent
            ? t('dashboard.report.investmentsNoteNow')
            : t('dashboard.report.investmentsNotePast', { month: monthLabel }),
          invested:            t('dashboard.invested'),
          marketValue:         t('dashboard.report.marketValue'),
          pnl:                 t('dashboard.report.pnl'),
          vs:                  t('dashboard.report.vs'),
          page:                t('dashboard.report.page'),
          noExpenses:          t('dashboard.noExpenses'),
        },
      }

      const [{ pdf }, { default: MonthlyReportDocument }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('../pdf/MonthlyReportDocument'),
      ])
      const blob = await pdf(<MonthlyReportDocument data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `financelli-report-${year}-${String(month).padStart(2, '0')}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generate,
    isGenerating,
    isLoading: model.isLoading || history.isLoading,
  }
}
