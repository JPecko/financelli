import { useQuery } from '@tanstack/react-query'
import { savingsGoalsRepo, type SavingsGoalInput } from '@/data/repositories/savingsGoalsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'

export function useSavingsGoals() {
  return useQuery({
    queryKey: queryKeys.savingsGoals.all(),
    queryFn:  savingsGoalsRepo.getAll,
  })
}

export async function saveSavingsGoal(input: SavingsGoalInput, id?: number) {
  if (id != null) await savingsGoalsRepo.update(id, input)
  else await savingsGoalsRepo.add(input)
  await queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals.all() })
}

export async function removeSavingsGoal(id: number) {
  await savingsGoalsRepo.remove(id)
  await queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals.all() })
}
