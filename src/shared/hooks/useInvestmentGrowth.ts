import { useMemo } from 'react'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useInvestmentCapitalAdjustments } from '@/shared/hooks/useTransactions'
import { usePurchaseHistoryByAccounts } from '@/shared/hooks/usePurchaseHistory'
import { computeAdjustedCostBasis } from '@/features/investments/utils/investmentMetrics'
import {
  DEFAULT_ANNUAL_RETURN_PCT, estimateAnnualReturnPct, investedForAverage, monthsSince,
  type InvestmentGrowth,
} from '@/domain/investmentGrowth'
import type { Account } from '@/domain/types'

/** Per investment account: market value, average monthly deposit and annual return used for projections. */
export function useInvestmentGrowth(accounts: Account[], balances: Record<number, number>) {
  const investmentIds = useMemo(
    () => accounts.filter(a => a.type === 'investment' && a.id != null).map(a => a.id!),
    [accounts],
  )
  const { data: holdings = [], isLoading: holdLoading } = useHoldings()
  const { data: capital = {} } = useInvestmentCapitalAdjustments(investmentIds)
  const purchasesQuery = usePurchaseHistoryByAccounts(investmentIds)
  const purchases = purchasesQuery.data

  const growth = useMemo<Record<number, InvestmentGrowth>>(() => {
    const result: Record<number, InvestmentGrowth> = {}
    for (const account of accounts) {
      if (account.type !== 'investment' || account.id == null) continue
      const accHoldings  = holdings.filter(h => h.accountId === account.id)
      const accPurchases = (purchases ?? []).filter(p => p.accountId === account.id)
      const { invested, firstDate } = investedForAverage(account, accPurchases, accHoldings, capital[account.id] ?? 0)
      const months = monthsSince(firstDate)
      const value  = balances[account.id] ?? 0
      // Same basis as the P&L shown on the Investments page; accounts without holdings fall back to deposits
      const cost   = accHoldings.length > 0 ? computeAdjustedCostBasis(account, accHoldings) : invested
      const historicalPct = estimateAnnualReturnPct(value, cost, months)
      result[account.id] = {
        value,
        monthlyContrib:    invested > 0 && months > 0 ? Math.max(invested / months, 0) : 0,
        annualReturnPct:   historicalPct ?? DEFAULT_ANNUAL_RETURN_PCT,
        returnFromHistory: historicalPct != null,
      }
    }
    return result
  }, [accounts, holdings, purchases, capital, balances])

  return { growth, isLoading: holdLoading || (investmentIds.length > 0 && purchasesQuery.isLoading) }
}
