import { useQuery } from '@tanstack/react-query'
import { holdingsRepo } from '@/data/repositories/holdingsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import type { Holding } from '@/domain/types'

export function useHoldings() {
  return useQuery({
    queryKey: queryKeys.holdings.all(),
    queryFn:  holdingsRepo.getAll,
  })
}

export function useHoldingsByAccount(accountId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.holdings.byAccount(accountId!),
    queryFn:  () => holdingsRepo.getByAccount(accountId!),
    enabled:  accountId != null,
  })
}

export async function addHolding(data: Omit<Holding, 'id' | 'createdAt'>) {
  const created = await holdingsRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all() })
  return created
}

export async function updateHolding(id: number, data: Partial<Holding>) {
  await holdingsRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all() })
}

export async function removeHolding(id: number) {
  await holdingsRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.holdings.all() })
}
