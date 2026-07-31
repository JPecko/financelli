import { useState } from 'react'
import { format, getYear, getMonth } from 'date-fns'
import { useDashboardModel } from './useDashboardModel'
import { useLaterSums } from '@/shared/hooks/useTransactions'
import { useT } from '@/shared/i18n'
import { tCategory } from '@/domain/categories'
import type { Account } from '@/domain/types'
import type { MonthlyReportData } from '../pdf/monthlyReport.types'

const now = new Date()

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
  const model = useDashboardModel(year, month)
  const comparison = getComparisonPeriod(year, month)

  // Cash accounts store a running balance — reconstruct the end-of-month value by undoing
  // transactions dated after the target month. Investment accounts have no holdings history,
  // so they always show today's market value (their delta is reported as unavailable).
  const { data: laterSums,           isLoading: laterSumsLoading           } = useLaterSums(year, month)
  const { data: laterSumsComparison, isLoading: laterSumsComparisonLoading } = useLaterSums(comparison.year, comparison.month)
  const [isGenerating, setIsGenerating] = useState(false)

  const balanceAt = (a: Account, laterSumsMap: Record<number, number> | undefined) =>
    a.balance - (laterSumsMap?.[a.id!] ?? 0)

  const generate = async () => {
    setIsGenerating(true)
    try {
      const monthLabel      = format(new Date(year, month - 1), 'MMMM yyyy')
      const comparisonLabel = format(new Date(comparison.year, comparison.month - 1), 'MMMM yyyy')
      const isCurrent        = isCurrentMonth(year, month)

      // Investment accounts have no holdings history — they can't be reconstructed for a past
      // month, so they're excluded from Net Worth/balances and shown separately as a snapshot.
      const accounts = model.accounts
        .filter(a => a.type !== 'investment')
        .map(a => {
          const balance         = balanceAt(a, laterSums)
          const previousBalance = balanceAt(a, laterSumsComparison)
          return {
            name: a.name,
            type: t(('accounts.types.' + a.type) as Parameters<typeof t>[0]),
            balance,
            previousBalance,
            delta: balance - previousBalance,
          }
        })

      const netWorthByType = Object.entries(
        accounts.reduce<Record<string, number>>((map, a) => {
          map[a.type] = (map[a.type] ?? 0) + a.balance
          return map
        }, {}),
      )
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))

      const netWorthTotal    = accounts.reduce((sum, a) => sum + a.balance, 0)
      const previousNetWorth = accounts.reduce((sum, a) => sum + a.previousBalance, 0)

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
        comparisonLabel,
        netWorthDelta: netWorthTotal - previousNetWorth,
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
    isLoading: model.isLoading || laterSumsLoading || laterSumsComparisonLoading,
  }
}
