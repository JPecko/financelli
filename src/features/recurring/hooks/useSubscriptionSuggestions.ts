import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, subMonths } from 'date-fns'
import { transactionsRepo } from '@/data/repositories/transactionsRepo'
import { dismissedSubscriptionsRepo } from '@/data/repositories/dismissedSubscriptionsRepo'
import { queryClient } from '@/app/queryClient'
import { queryKeys } from '@/data/queryKeys'
import { useRecurringRules } from '@/shared/hooks/useRecurringRules'
import { DETECTION_LOOKBACK_MONTHS, detectSubscriptions, type SubscriptionCandidate } from '@/domain/subscriptionDetection'
import type { RecurringPrefill } from '../components/RecurringStandardTab'

// Month-start, so the query key (and cache) stays the same for the whole month
const since = format(subMonths(new Date(), DETECTION_LOOKBACK_MONTHS), 'yyyy-MM-01')

/** Repeating expenses not yet covered by a recurring rule, minus the ones the user dismissed. */
export function useSubscriptionSuggestions() {
  const { data: rules = [] } = useRecurringRules()
  const expenses = useQuery({
    queryKey: queryKeys.transactions.expensesSince(since),
    queryFn:  () => transactionsRepo.getExpensesSince(since),
  })
  // A missing table must not hide the suggestions, only make dismissals non-persistent
  const dismissed = useQuery({
    queryKey: queryKeys.dismissedSubscriptions.all(),
    queryFn:  dismissedSubscriptionsRepo.getKeys,
  })

  const suggestions = useMemo(
    () => detectSubscriptions(expenses.data ?? [], rules, new Set(dismissed.data ?? [])),
    [expenses.data, rules, dismissed.data],
  )
  const monthlyTotal = suggestions.reduce((s, c) => s + c.monthlyCost, 0)

  return { suggestions, monthlyTotal, isLoading: expenses.isLoading || dismissed.isLoading }
}

export async function dismissSubscription(key: string) {
  await dismissedSubscriptionsRepo.add(key)
  await queryClient.invalidateQueries({ queryKey: queryKeys.dismissedSubscriptions.all() })
}

// The rule starts at the next expected charge, so charges already recorded are never duplicated
export function toRecurringPrefill(c: SubscriptionCandidate): RecurringPrefill {
  return {
    accountId:   c.accountId,
    name:        c.description,
    amount:      c.amount,
    category:    c.category,
    description: c.description,
    frequency:   c.frequency,
    startDate:   c.nextDate,
  }
}
