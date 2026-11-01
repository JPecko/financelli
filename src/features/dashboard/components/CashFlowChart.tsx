import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend,
} from 'recharts'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { formatTooltipValue } from '../utils/dashboardHelpers'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/shared/utils/chartStyle'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import styles from './CashFlowChart.module.scss'

interface Props {
  barData: {
    month: string; income: number; salary: number; mealCard: number; otherIncome: number
    expenses: number; investing: number; roundup: number
  }[]
}

export default function CashFlowChart({ barData }: Props) {
  const t = useT()

  const { avgIncome, avgOutcome, monthIncome, monthOutcome } = useMemo(() => {
    if (barData.length === 0) return { avgIncome: 0, avgOutcome: 0, monthIncome: 0, monthOutcome: 0 }
    const outcomeOf = (m: Props['barData'][number]) => m.expenses + m.investing + m.roundup
    const current   = barData[barData.length - 1]
    return {
      avgIncome:    barData.reduce((s, m) => s + m.income, 0) / barData.length,
      avgOutcome:   barData.reduce((s, m) => s + outcomeOf(m), 0) / barData.length,
      monthIncome:  current.income,
      monthOutcome: outcomeOf(current),
    }
  }, [barData])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">{t('dashboard.incomeVsOutcome')}</CardTitle>
          <PageHelpInfo title={t('dashboard.sections.cashFlow.title')} body={t('dashboard.sections.cashFlow.body')} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <MonthTotal label={t('dashboard.incomeThisMonth')} value={monthIncome} tone="text-emerald-600" />
          <MonthTotal label={t('dashboard.outcomeThisMonth')} value={monthOutcome} tone="text-rose-500" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
          <span>{t('dashboard.avgIncome')}: <span className="font-medium text-emerald-600">{formatMoney(avgIncome)}</span></span>
          <span>{t('dashboard.avgOutcome')}: <span className="font-medium text-rose-500">{formatMoney(avgOutcome)}</span></span>
        </div>
      </CardHeader>
      <CardContent className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis width={50} tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v).replace(/[^0-9,.-]/g, '')} />
            <ReTooltip
              formatter={(value, name) => [formatTooltipValue(value), String(name ?? '')]}
              contentStyle={chartTooltipStyle}
              labelStyle={chartTooltipLabelStyle}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="salary"      name={t('dashboard.salary')}    fill="#22c55e" stackId="income"  maxBarSize={28} />
            <Bar dataKey="mealCard"    name={t('dashboard.mealCard')}  fill="#15803d" stackId="income"  maxBarSize={28} />
            <Bar dataKey="otherIncome" name={t('dashboard.otherIncome')} fill="#a3e635" stackId="income" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses"  name={t('dashboard.expenses')}  fill="#f43f5e" stackId="outcome"    maxBarSize={28} />
            <Bar dataKey="investing" name={t('dashboard.investing')} fill="#8b5cf6" stackId="outcome"    maxBarSize={28} />
            <Bar dataKey="roundup"   name={t('dashboard.roundup')}   fill="#78716c" stackId="outcome" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function MonthTotal({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold tabular-nums ${tone}`}>{formatMoney(value)}</p>
    </div>
  )
}
