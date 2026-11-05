import { useMemo } from 'react'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAssets } from '@/shared/hooks/useAssets'
import { useAssetPricesByAssets, usePurchaseHistoryByAccounts } from '@/shared/hooks/usePurchaseHistory'
import { estimateAccountValueAt, indexPortfolioInputs } from '@/domain/portfolioEstimate'
import type { InvestmentEstimator } from '@/domain/netWorth'
import type { Account } from '@/domain/types'

/** Estimates past investment values from imported purchases + recorded prices, for months without a snapshot. */
export function usePortfolioEstimator(accounts: Account[]) {
  const investmentIds = useMemo(
    () => accounts.filter(a => a.type === 'investment' && a.id != null).map(a => a.id!),
    [accounts],
  )
  const purchasesQuery = usePurchaseHistoryByAccounts(investmentIds)
  const { data: holdings = [], isLoading: holdLoading  } = useHoldings()
  const { data: assets   = [], isLoading: assetLoading } = useAssets()
  const purchases = purchasesQuery.data

  const assetIds = useMemo(() => {
    const ids = new Set<number>()
    for (const p of purchases ?? []) ids.add(p.assetId)
    for (const h of holdings) if (investmentIds.includes(h.accountId)) ids.add(h.assetId)
    return [...ids].sort((a, b) => a - b)
  }, [purchases, holdings, investmentIds])
  const pricesQuery = useAssetPricesByAssets(assetIds)

  const estimate = useMemo<InvestmentEstimator>(() => {
    const idx = indexPortfolioInputs({
      purchases: purchases ?? [],
      holdings:  holdings.filter(h => investmentIds.includes(h.accountId)),
      prices:    pricesQuery.data ?? [],
      assetMap:  Object.fromEntries(assets.map(a => [a.id!, a])),
    })
    return (account, endDate) => estimateAccountValueAt(idx, account, endDate)
  }, [purchases, holdings, pricesQuery.data, assets, investmentIds])

  return {
    estimate,
    isLoading: purchasesQuery.isLoading || holdLoading || assetLoading || pricesQuery.isLoading,
  }
}
