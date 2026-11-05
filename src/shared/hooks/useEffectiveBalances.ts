import { useMemo } from 'react'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAssets } from '@/shared/hooks/useAssets'
import { computeAccountBalance } from '@/features/investments/utils/investmentMetrics'
import type { Account } from '@/domain/types'

/** Live balance per account: the stored balance for cash accounts, market value for investments with holdings. */
export function useEffectiveBalances(accounts: Account[]) {
  const { data: holdings = [], isLoading: holdLoading  } = useHoldings()
  const { data: assets   = [], isLoading: assetLoading } = useAssets()

  const balances = useMemo<Record<number, number>>(() => {
    const assetMap = Object.fromEntries(assets.map(a => [a.id!, a]))
    const result: Record<number, number> = {}
    for (const account of accounts) {
      if (account.id == null) continue
      result[account.id] = account.type === 'investment'
        ? computeAccountBalance(account, holdings.filter(h => h.accountId === account.id), assetMap)
        : account.balance
    }
    return result
  }, [accounts, holdings, assets])

  return { balances, isLoading: holdLoading || assetLoading }
}
