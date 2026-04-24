import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip, Legend,
} from 'recharts'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { formatTooltipValue } from '../utils/dashboardHelpers'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/shared/utils/chartStyle'

interface Props {
  barData: { month: string; income: number; expenses: number; investing: number; roundup: number }[]
}

export default function CashFlowChart({ barData }: Props) {
  const t = useT()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('dashboard.incomeVsOutcome')}</CardTitle>
      </CardHeader>
      <CardContent>
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
            <Bar dataKey="income"    name={t('dashboard.income')}    fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses"  name={t('dashboard.expenses')}  fill="#f43f5e" stackId="outcome"    maxBarSize={28} />
            <Bar dataKey="investing" name={t('dashboard.investing')} fill="#8b5cf6" stackId="outcome"    maxBarSize={28} />
            <Bar dataKey="roundup"   name={t('dashboard.roundup')}   fill="#78716c" stackId="outcome" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
