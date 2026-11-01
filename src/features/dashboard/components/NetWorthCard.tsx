import { ChevronLeft, ChevronRight, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { formatMoney } from '@/domain/money'
import { useT } from '@/shared/i18n'
import PageHelpInfo from '@/shared/components/PageHelpInfo'
import BalanceValue from '@/shared/components/BalanceValue'
import NetWorthBreakdown from './NetWorthBreakdown'
import { useNetWorthNavigator } from '../hooks/useNetWorthNavigator'
import type { Account } from '@/domain/types'

interface Props {
  accounts:          Account[]
  effectiveBalances: Record<number, number>
}

export default function NetWorthCard({ accounts, effectiveBalances }: Props) {
  const t  = useT()
  const nw = useNetWorthNavigator(accounts, effectiveBalances)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.netWorth')}</CardTitle>
          <PageHelpInfo title={t('dashboard.sections.netWorth.title')} body={t('dashboard.sections.netWorth.body')} />
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-1 flex items-center justify-between gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!nw.canGoBack} onClick={nw.goBack} aria-label={t('dashboard.previousMonth')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize">
            {nw.isCurrent ? t('dashboard.netWorthToday') : nw.label}
          </span>
          <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!nw.canGoForward} onClick={nw.goForward} aria-label={t('dashboard.nextMonth')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <BalanceValue><div className="text-2xl font-bold">{formatMoney(nw.total)}</div></BalanceValue>
        {nw.delta != null && <GrowthLine delta={nw.delta} deltaPct={nw.deltaPct} label={t('dashboard.vsPreviousMonth')} />}
        {nw.missingInvestments && <CardNote>{t('dashboard.netWorthMissingInvestments')}</CardNote>}
        {nw.estimatedInvestments && <CardNote>{t('dashboard.netWorthEstimatedInvestments')}</CardNote>}

        <div className="mt-3">
          {nw.byType.length === 0
            ? <p className="text-sm text-muted-foreground">{t('dashboard.noAccounts')}</p>
            : <NetWorthBreakdown byType={nw.byType} positiveTotal={nw.positiveTotal} />}
        </div>
      </CardContent>
    </Card>
  )
}

function GrowthLine({ delta, deltaPct, label }: { delta: number; deltaPct: number | null; label: string }) {
  const tone = delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
  const sign = delta >= 0 ? '+' : ''
  return (
    <p className="mt-0.5 text-sm text-muted-foreground">
      <BalanceValue>
        <span className={`font-medium ${tone}`}>
          {sign}{formatMoney(delta)}{deltaPct != null && ` (${sign}${deltaPct}%)`}
        </span>
      </BalanceValue>{' '}
      {label}
    </p>
  )
}

function CardNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted-foreground">{children}</p>
}
