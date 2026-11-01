import { useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { investmentSnapshotsRepo } from '@/data/repositories/investmentSnapshotsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useHoldings } from '@/shared/hooks/useHoldings'
import { useAssets } from '@/shared/hooks/useAssets'
import { computeAccountBalance } from '@/features/investments/utils/investmentMetrics'
import { monthEndDate } from '@/domain/netWorth'
import type { InvestmentSnapshot } from '@/domain/types'

export function useInvestmentSnapshots(fromDate: string) {
  return useQuery({
    queryKey: queryKeys.investmentSnapshots.since(fromDate),
    queryFn:  () => investmentSnapshotsRepo.getSince(fromDate),
  })
}

/** Keeps this month's snapshot of every owned investment account in sync with its live market value. */
export function useInvestmentSnapshotSync() {
  const { user } = useAuth()
  const { data: accounts = [], isLoading: accLoading  } = useAccounts()
  const { data: holdings = [], isLoading: holdLoading } = useHoldings()
  const { data: assets   = [], isLoading: assetLoading } = useAssets()
  const lastWritten = useRef<string | null>(null)
  const isLoading = accLoading || holdLoading || assetLoading

  const snapshots = useMemo<InvestmentSnapshot[]>(() => {
    if (isLoading || !user) return []
    const now          = new Date()
    const snapshotDate = monthEndDate({ year: now.getFullYear(), month: now.getMonth() + 1 })
    const assetMap     = Object.fromEntries(assets.map(a => [a.id!, a]))
    // Shared users skip writing: the owner's snapshot is the single source of truth
    return accounts
      .filter(a => a.type === 'investment' && a.id != null && (a.ownerId == null || a.ownerId === user.id))
      .map(a => ({
        accountId:  a.id!,
        snapshotDate,
        valueCents: Math.round(computeAccountBalance(a, holdings.filter(h => h.accountId === a.id), assetMap)),
      }))
  }, [isLoading, user, accounts, holdings, assets])

  useEffect(() => {
    if (snapshots.length === 0) return
    const signature = JSON.stringify(snapshots)
    if (signature === lastWritten.current) return
    lastWritten.current = signature
    investmentSnapshotsRepo.upsertMany(snapshots)
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.investmentSnapshots.all() }))
      .catch(err => console.warn('[investment snapshots] write failed', err))
  }, [snapshots])
}
