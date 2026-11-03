import { useMemo } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useTransactionsByMonth } from '@/shared/hooks/useTransactions'
import { useSharedExpensesByMonth } from '@/shared/hooks/useSharedExpenses'
import { useMyGroupExpenses } from '@/shared/hooks/useGroups'
import { computeCategorySpending } from '@/shared/utils/categorySpending'

/** Personal spending per category (cents) for one month. */
export function useCategorySpending(year: number, month: number) {
  const { user } = useAuth()
  const txQuery     = useTransactionsByMonth(year, month)
  const seQuery     = useSharedExpensesByMonth(year, month)
  const groupQuery  = useMyGroupExpenses(year, month)
  const { data: accounts = [] } = useAccounts()

  const spending = useMemo(() => computeCategorySpending({
    transactions:   txQuery.data ?? [],
    sharedExpenses: seQuery.data ?? [],
    groupExpenses:  groupQuery.data ?? [],
    accounts,
    userId:         user?.id,
  }), [txQuery.data, seQuery.data, groupQuery.data, accounts, user?.id])

  return { spending, isLoading: txQuery.isLoading || seQuery.isLoading || groupQuery.isLoading }
}
