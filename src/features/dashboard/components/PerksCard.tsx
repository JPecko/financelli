import { BadgePercent, Coins } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip,
} from 'recharts'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import { formatTooltipValue } from '../utils/dashboardHelpers'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/shared/utils/chartStyle'

interface Props {
  cashbackMonth: number
  roundupMonth:  number
  yearBenefits?: { cashback: number; roundup: number } | null
  benefitsData:  { month: string; cashback: number; roundup: number }[]
  className?:    string
}

export default function PerksCard({ cashbackMonth, roundupMonth, yearBenefits, benefitsData, className }: Props) {
  const t = useT()

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{t('dashboard.perks')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <BadgePercent className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.cashback')}</p>
              <p className="text-base font-bold">{formatMoney(cashbackMonth)}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.ytd')}: {formatMoney(yearBenefits?.cashback ?? 0)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-500/10">
              <Coins className="h-4 w-4 text-stone-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.roundup')}</p>
              <p className="text-base font-bold">{formatMoney(roundupMonth)}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.ytd')}: {formatMoney(yearBenefits?.roundup ?? 0)}</p>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={benefitsData} margin={{ top: 5, right: 10, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis width={50} tick={{ fontSize: 11 }} tickFormatter={v => formatMoney(v).replace(/[^0-9,.-]/g, '')} />
            <ReTooltip
              formatter={(value, name) => [formatTooltipValue(value), String(name ?? '')]}
              contentStyle={chartTooltipStyle}
              labelStyle={chartTooltipLabelStyle}
            />
            <Line type="monotone" dataKey="cashback" name={t('dashboard.cashback')} stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="roundup"  name={t('dashboard.roundup')}  stroke="#78716c" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
