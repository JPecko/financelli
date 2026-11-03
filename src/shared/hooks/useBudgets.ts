import { useQuery } from '@tanstack/react-query'
import { budgetsRepo } from '@/data/repositories/budgetsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets.all(),
    queryFn:  budgetsRepo.getAll,
  })
}

export async function saveBudget(category: string, amountCents: number) {
  await budgetsRepo.save(category, amountCents)
  await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all() })
}

export async function removeBudget(id: number) {
  await budgetsRepo.remove(id)
  await queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all() })
}
