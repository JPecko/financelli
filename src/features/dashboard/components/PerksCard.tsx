import { BadgePercent, Coins, PiggyBank } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip as ReTooltip,
} from 'recharts'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import { formatTooltipValue } from '../utils/dashboardHelpers'
import { chartTooltipStyle, chartTooltipLabelStyle } from '@/shared/utils/chartStyle'

interface Props {
  cashbackMonth: number
  roundupMonth:  number
  interestMonth: number
  yearBenefits?: { cashback: number; roundup: number; interest: number } | null
  benefitsData:  { month: string; cashback: number; roundup: number; interest: number }[]
  className?:    string
}

export default function PerksCard({ cashbackMonth, roundupMonth, interestMonth, yearBenefits, benefitsData, className }: Props) {
  const t = useT()

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium">{t('dashboard.perks')}</CardTitle>
          <PageHelpInfo title={t('dashboard.sections.perks.title')} body={t('dashboard.sections.perks.body')} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <PerkStat
            icon={<BadgePercent className="h-4 w-4 text-emerald-600" />}
            iconBg="bg-emerald-500/10"
            label={t('dashboard.cashback')}
            month={cashbackMonth}
            ytd={yearBenefits?.cashback ?? 0}
            ytdLabel={t('dashboard.ytd')}
          />
          <PerkStat
            icon={<Coins className="h-4 w-4 text-stone-500" />}
            iconBg="bg-stone-500/10"
            label={t('dashboard.roundup')}
            month={roundupMonth}
            ytd={yearBenefits?.roundup ?? 0}
            ytdLabel={t('dashboard.ytd')}
          />
          <PerkStat
            icon={<PiggyBank className="h-4 w-4 text-sky-500" />}
            iconBg="bg-sky-500/10"
            label={t('dashboard.interest')}
            month={interestMonth}
            ytd={yearBenefits?.interest ?? 0}
            ytdLabel={t('dashboard.ytd')}
          />
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
            <Line type="monotone" dataKey="interest" name={t('dashboard.interest')} stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

interface PerkStatProps {
  icon:     React.ReactNode
  iconBg:   string
  label:    string
  month:    number
  ytd:      number
  ytdLabel: string
}

function PerkStat({ icon, iconBg, label, month, ytd, ytdLabel }: PerkStatProps) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base font-bold">{formatMoney(month)}</p>
        <p className="text-sm text-muted-foreground">{ytdLabel}: {formatMoney(ytd)}</p>
      </div>
    </div>
  )
}
