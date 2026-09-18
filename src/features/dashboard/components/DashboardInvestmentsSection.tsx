import { TrendingUp } from 'lucide-react'
import { useDashboardInvestmentsSection } from '../hooks/useDashboardInvestmentsSection'
import InvestmentAccountSelector from '@/features/investments/components/InvestmentAccountSelector'
import InvestmentHistoryChart from '@/features/investments/components/InvestmentHistoryChart'
import { useT } from '@/shared/i18n'
import PageHelpInfo from '@/shared/components/PageHelpInfo'

export default function DashboardInvestmentsSection() {
  const t = useT()
  const m = useDashboardInvestmentsSection()

  if (m.isLoading || m.investmentAccounts.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <TrendingUp className="h-4 w-4" />
        <p className="text-sm font-medium uppercase tracking-wide">{t('investments.title')}</p>
        <PageHelpInfo title={t('dashboard.sections.investments.title')} body={t('dashboard.sections.investments.body')} />
      </div>

      <InvestmentAccountSelector
        accounts={m.investmentAccounts}
        statsMap={m.accountStatsMap}
        selectedId={m.selectedAccountId}
        onSelect={m.setSelectedAccountId}
      />

      {m.selectedAccount && (
        <InvestmentHistoryChart
          accountId={m.selectedAccount.id!}
          accountName={m.selectedAccount.name}
          assetMap={m.assetMap}
        />
      )}
    </div>
  )
}
