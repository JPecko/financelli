import { useQuery } from '@tanstack/react-query'
import { recurringRepo } from '@/data/repositories/recurringRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import type { RecurringRule } from '@/domain/types'

// ─── Query ───────────────────────────────────────────────────────────────────

export function useRecurringRules() {
  return useQuery({
    queryKey: queryKeys.rules.all(),
    queryFn:  recurringRepo.getAll,
  })
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function addRule(data: Omit<RecurringRule, 'id' | 'createdAt'>) {
  await recurringRepo.add(data)
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}

export async function updateRule(id: number, data: Partial<RecurringRule>) {
  await recurringRepo.update(id, data)
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}

export async function removeRule(id: number) {
  await recurringRepo.remove(id)
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}
