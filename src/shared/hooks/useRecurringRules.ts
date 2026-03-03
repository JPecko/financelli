import { useState, useEffect } from 'react'
import { useRefresh, emitRefresh } from '@/shared/hooks/useRefresh'
import { recurringRepo } from '@/data/repositories/recurringRepo'
import type { RecurringRule } from '@/domain/types'

export function useRecurringRules(): RecurringRule[] {
  const [rules, setRules] = useState<RecurringRule[]>([])
  const key = useRefresh()
  useEffect(() => { recurringRepo.getAll().then(setRules) }, [key])
  return rules
}

export async function addRule(data: Omit<RecurringRule, 'id' | 'createdAt'>) {
  await recurringRepo.add(data)
  emitRefresh()
}

export async function updateRule(id: number, data: Partial<RecurringRule>) {
  await recurringRepo.update(id, data)
  emitRefresh()
}

export async function removeRule(id: number) {
  await recurringRepo.remove(id)
  emitRefresh()
}
