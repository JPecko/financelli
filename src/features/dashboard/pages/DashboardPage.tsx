import { format } from 'date-fns'
import PageLoader from '@/shared/components/PageLoader'
import InvestmentAccountCard from '../components/InvestmentAccountCard'
import GroupsWidget from '../components/GroupsWidget'
import NetWorthCard from '../components/NetWorthCard'
import MonthSummaryCard from '../components/MonthSummaryCard'
import AccountBalancesCard from '../components/AccountBalancesCard'
import PerksCard from '../components/PerksCard'
import CashFlowChart from '../components/CashFlowChart'
import SpendingByCategoryCard from '../components/SpendingByCategoryCard'
import TopExpensesCard from '../components/TopExpensesCard'
import { useDashboardModel } from '../hooks/useDashboardModel'
import { usePriceSync } from '@/shared/hooks/usePriceSync'
import { useT } from '@/shared/i18n'

const now = new Date()

export default function DashboardPage() {
  const t     = useT()
  const model = useDashboardModel()
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
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{format(now, 'MMMM yyyy')}</p>
      </div>

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

      {/* Investment account evolution */}
      {model.investmentAccounts.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t('dashboard.investmentHistory')}
          </p>
          <div className="grid gap-4">
            {model.investmentAccounts.map(acc => (
              <InvestmentAccountCard
                key={acc.id}
                account={acc}
                holdings={model.allHoldings.filter(h => h.accountId === acc.id)}
                assets={model.allAssets}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
