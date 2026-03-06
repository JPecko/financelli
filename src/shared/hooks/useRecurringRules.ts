import { useQuery } from '@tanstack/react-query'
import { formatISO } from 'date-fns'
import { recurringRepo, advanceDueDate } from '@/data/repositories/recurringRepo'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
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

// ─── Apply ───────────────────────────────────────────────────────────────────

/** Creates a transaction from a rule for the given date (defaults to rule.nextDue)
 *  and advances the rule's nextDue to the next occurrence. */
export async function applyRule(rule: RecurringRule, date?: string): Promise<void> {
  const applyDate = date ?? rule.nextDue
  await transactionsRepo.add({
    accountId:       rule.accountId,
    toAccountId:     rule.toAccountId,
    amount:          rule.amount,
    type:            rule.type,
    category:        rule.category,
    description:     rule.description || rule.name,
    date:            applyDate,
    recurringRuleId: rule.id,
  })
  await recurringRepo.advance(rule.id!, rule.frequency, rule.nextDue)
  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}

/** On session start: applies all active rules whose nextDue <= today (catches up missed runs). */
export async function autoApplyDueRules(): Promise<void> {
  const today = formatISO(new Date(), { representation: 'date' })
  const rules = await recurringRepo.getActive()
  const due   = rules.filter(r => r.nextDue <= today)

  if (due.length === 0) return

  for (const rule of due) {
    let currentDue = rule.nextDue
    while (currentDue <= today) {
      await transactionsRepo.add({
        accountId:       rule.accountId,
        toAccountId:     rule.toAccountId,
        amount:          rule.amount,
        type:            rule.type,
        category:        rule.category,
        description:     rule.description || rule.name,
        date:            currentDue,
        recurringRuleId: rule.id,
      })
      await recurringRepo.advance(rule.id!, rule.frequency, currentDue)
      currentDue = advanceDueDate(currentDue, rule.frequency)
    }
  }

  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() })
  queryClient.invalidateQueries({ queryKey: queryKeys.rules.all() })
}
