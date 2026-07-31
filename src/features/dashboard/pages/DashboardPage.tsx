import { useState } from 'react'
import { format } from 'date-fns'
import { FileDown } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import PageLoader from '@/shared/components/PageLoader'
import GroupsWidget from '../components/GroupsWidget'
import NetWorthCard from '../components/NetWorthCard'
import MonthSummaryCard from '../components/MonthSummaryCard'
import AccountBalancesCard from '../components/AccountBalancesCard'
import PerksCard from '../components/PerksCard'
import CashFlowChart from '../components/CashFlowChart'
import SpendingByCategoryCard from '../components/SpendingByCategoryCard'
import TopExpensesCard from '../components/TopExpensesCard'
import DashboardInvestmentsSection from '../components/DashboardInvestmentsSection'
import ExportReportModal from '../components/ExportReportModal'
import { useDashboardModel } from '../hooks/useDashboardModel'
import { usePriceSync } from '@/shared/hooks/usePriceSync'
import { useT } from '@/shared/i18n'

const now = new Date()

export default function DashboardPage() {
  const t     = useT()
  const model = useDashboardModel()
  const [exportOpen, setExportOpen] = useState(false)
  usePriceSync()

  if (model.isLoading) return <PageLoader message={t('dashboard.loading')} />

  const perksProps = {
    cashbackMonth: model.cashbackMonth,
    roundupMonth:  model.roundupMonth,
    yearBenefits:  model.yearBenefits,
    benefitsData:  model.benefitsData,
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{format(now, 'MMMM yyyy')}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setExportOpen(true)}>
          <FileDown className="h-4 w-4" />
          {t('dashboard.exportReport')}
        </Button>
      </div>

      {exportOpen && <ExportReportModal open={exportOpen} onClose={() => setExportOpen(false)} />}

      {/* Row 1: Net Worth | Month Summary | Account Balances (+ Perks on mobile) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NetWorthCard
          netWorthTotal={model.netWorthTotal}
          netWorthByType={model.netWorthByType}
          positiveTotal={model.positiveTotal}
        />
        <MonthSummaryCard
          summary={model.summary}
          savingsRate={model.savingsRate}
        />
        <AccountBalancesCard
          accounts={model.accounts}
          effectiveBalances={model.effectiveBalances}
        />
        {model.hasBenefits && (
          <PerksCard {...perksProps} className="lg:hidden sm:col-span-2 xl:col-span-1" />
        )}
      </div>

      <GroupsWidget />

      {/* Row 2: Cash flow chart | Spending by category */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CashFlowChart barData={model.barData} />
        <SpendingByCategoryCard
          categoryData={model.categoryData}
          categoryTotal={model.categoryTotal}
          onCategoryClick={model.handleCategoryClick}
        />
      </div>

      {/* Row 3: Top expenses | Perks (desktop only) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopExpensesCard topExpenses={model.topExpenses} hasBenefits={model.hasBenefits} />
        {model.hasBenefits && <PerksCard {...perksProps} className="hidden lg:block" />}
      </div>

      <DashboardInvestmentsSection />
    </div>
  )
}
