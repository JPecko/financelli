import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { queryKeys } from '@/data/queryKeys'
import { useInvestmentSnapshots } from '@/shared/hooks/useInvestmentSnapshots'
import { usePortfolioEstimator } from './usePortfolioEstimator'
import {
  buildNetWorthMonth, indexSnapshots, monthEndDate, shiftMonth, sumBalances,
  type NetWorthMonth, type YearMonth,
} from '@/domain/netWorth'
import type { Account } from '@/domain/types'

function isCurrentMonth({ year, month }: YearMonth) {
  const now = new Date()
  return year === now.getFullYear() && month === now.getMonth() + 1
}

/** Month-end net worth for `count` months ending at `end` (oldest first). The current month uses live balances. */
export function useNetWorthHistory(
  accounts: Account[],
  liveBalances: Record<number, number>,
  end: YearMonth,
  count: number,
) {
  const oldest    = shiftMonth(end, -(count - 1))
  const oldestEnd = monthEndDate(oldest)

  const deltasQuery = useQuery({
    queryKey: queryKeys.transactions.balanceDeltasAfter(oldestEnd),
    queryFn:  () => transactionsRepo.getBalanceDeltasAfter(oldestEnd),
  })
  const snapshotsQuery = useInvestmentSnapshots(oldestEnd)
  // A missing snapshots table must not block the cash-only history
  const snapshots = snapshotsQuery.data ?? (snapshotsQuery.isError ? [] : undefined)
  const estimator = usePortfolioEstimator(accounts)

  const months = useMemo<NetWorthMonth[]>(() => {
    if (!deltasQuery.data || !snapshots || estimator.isLoading) return []
    const index = indexSnapshots(snapshots)
    return Array.from({ length: count }, (_, i) => {
      const ym = shiftMonth(oldest, i)
      if (isCurrentMonth(ym)) {
        return { ...ym, balances: liveBalances, total: sumBalances(liveBalances), missingInvestments: false, estimatedInvestments: false }
      }
      return buildNetWorthMonth(ym, accounts, deltasQuery.data, index, estimator.estimate)
    })
    // oldest is derived from end/count, which are already deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deltasQuery.data, snapshots, estimator.isLoading, estimator.estimate, accounts, liveBalances, end.year, end.month, count])

  return { months, isLoading: deltasQuery.isLoading || snapshotsQuery.isLoading || estimator.isLoading }
}
