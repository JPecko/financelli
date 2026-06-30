import { useState, useEffect, useMemo } from 'react'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAssets } from '@/shared/hooks/useAssets'
import { useInvestmentCapitalAdjustments } from '@/shared/hooks/useTransactions'
import { computeMarketValue } from '@/features/investments/utils/investmentMetrics'
import type { AccountStats } from '@/features/investments/hooks/useInvestmentsPageModel'

export function useDashboardInvestmentsSection() {
  const { data: accounts = [], isLoading: loadingAccounts } = useAccounts()
  const { data: holdings = [], isLoading: loadingHoldings } = useHoldings()
  const { data: assets   = [], isLoading: loadingAssets   } = useAssets()

  const investmentAccounts   = useMemo(() => accounts.filter(a => a.type === 'investment'), [accounts])
  const investmentAccountIds = useMemo(() => investmentAccounts.flatMap(a => a.id != null ? [a.id] : []), [investmentAccounts])

  const { data: capitalAdjustments = {} } = useInvestmentCapitalAdjustments(investmentAccountIds)

  const assetMap = useMemo(() => Object.fromEntries(assets.map(a => [a.id!, a])), [assets])

  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)

  useEffect(() => {
    if (selectedAccountId == null && investmentAccounts.length > 0) {
      setSelectedAccountId(investmentAccounts[0].id!)
    }
  }, [investmentAccounts, selectedAccountId])

  const accountStatsMap = useMemo<Record<number, AccountStats>>(() => {
    const map: Record<number, AccountStats> = {}
    for (const account of investmentAccounts) {
      if (account.id == null) continue
      const acctHoldings = holdings.filter(h => h.accountId === account.id)
      const marketValue  = computeMarketValue(acctHoldings, assetMap)
      const costBasis    = acctHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
      const adjCost      = costBasis + (account.entryFee ?? 0) * acctHoldings.length
      const pnl          = marketValue - adjCost
      const pnlPct       = adjCost > 0 ? (pnl / adjCost) * 100 : 0
      map[account.id]    = { marketValue, pnl, pnlPct }
    }
    return map
  }, [investmentAccounts, holdings, assetMap])

  const selectedAccount  = useMemo(
    () => investmentAccounts.find(a => a.id === selectedAccountId) ?? null,
    [investmentAccounts, selectedAccountId],
  )
  const selectedHoldings = useMemo(
    () => holdings.filter(h => h.accountId === selectedAccountId).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    [holdings, selectedAccountId],
  )

  const capitalAmount   = selectedAccount?.id != null ? (capitalAdjustments[selectedAccount.id] ?? 0) : 0
  const selMarketValue  = selectedHoldings.reduce((s, h) => s + h.quantity * (assetMap[h.assetId]?.currentPrice ?? 0), 0)
  const selCost         = selectedHoldings.reduce((s, h) => s + h.quantity * h.avgCost, 0)
  const selFees         = (selectedAccount?.entryFee ?? 0) * selectedHoldings.length
  const selAdjCost      = selCost + selFees
  const selPnL          = selMarketValue - selAdjCost
  const selPnLPct       = selAdjCost > 0 ? (selPnL / selAdjCost) * 100 : 0
  const selInvestedBase = (selectedAccount?.investedBase ?? 0) + capitalAmount

  return {
    isLoading: loadingAccounts || loadingHoldings || loadingAssets,
    investmentAccounts,
    assetMap,
    accountStatsMap,
    selectedAccountId,
    selectedAccount,
    selectedHoldings,
    setSelectedAccountId,
    selMarketValue,
    selAdjCost,
    selFees,
    selPnL,
    selPnLPct,
    selInvestedBase,
  }
}
