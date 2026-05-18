import { useQuery } from '@tanstack/react-query'
import { purchaseHistoryRepo } from '@/data/repositories/purchaseHistoryRepo'
import { assetPricesRepo } from '@/data/repositories/assetPricesRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import type { PurchaseHistory } from '@/domain/types'

export function usePurchaseHistoryByAccount(accountId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.purchaseHistory.byAccount(accountId!),
    queryFn:  () => purchaseHistoryRepo.getByAccount(accountId!),
    enabled:  accountId != null,
  })
}

export function useAssetPricesByAssets(assetIds: number[]) {
  return useQuery({
    queryKey: queryKeys.assetPrices.byAssets(assetIds),
    queryFn:  () => assetPricesRepo.getByAssets(assetIds),
    enabled:  assetIds.length > 0,
  })
}

export async function replacePurchaseHistory(
  accountId: number,
  assetId: number,
  items: Omit<PurchaseHistory, 'id' | 'createdAt'>[],
): Promise<void> {
  await purchaseHistoryRepo.clearByAccountAndAsset(accountId, assetId)
  await purchaseHistoryRepo.addMany(items)
  queryClient.invalidateQueries({ queryKey: queryKeys.purchaseHistory.byAccount(accountId) })
}
