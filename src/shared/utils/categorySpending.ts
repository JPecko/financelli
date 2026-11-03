import { isCashFlow, personalDivisorFor } from '@/shared/hooks/useTransactions'
import type { Account, GroupExpenseItem, SharedExpense, Transaction } from '@/domain/types'

const INVESTING_CATS = new Set(['investing', 'invest-move', 'capital'])

interface SpendingInputs {
  transactions:   Transaction[]
  sharedExpenses: SharedExpense[]
  groupExpenses:  GroupExpenseItem[]
  accounts:       Account[]
  userId?:        string
}

/** The user's personal spending per category in cents (own share of shared accounts, splits and groups). */
export function computeCategorySpending({
  transactions, sharedExpenses, groupExpenses, accounts, userId,
}: SpendingInputs): Record<string, number> {
  const txSeMap: Record<number, SharedExpense> = {}
  for (const se of sharedExpenses) {
    if (se.payer === 'me' && se.transactionId != null) txSeMap[se.transactionId] = se
  }
  const map: Record<string, number> = {}
  const add = (category: string, amount: number) => { map[category] = (map[category] ?? 0) + amount }

  for (const tx of transactions) {
    if (!isCashFlow(tx) || tx.amount >= 0) continue
    if (tx.id != null && txSeMap[tx.id] != null) { add(tx.category, txSeMap[tx.id].myShare); continue }
    const divisor = personalDivisorFor(tx, userId, accounts)
    if (divisor !== Infinity) add(tx.category, Math.abs(tx.amount) / divisor)
  }
  for (const se of sharedExpenses) {
    if (se.payer === 'other' && se.status !== 'ignored') add(se.category, se.myShare)
  }
  for (const g of groupExpenses) {
    if (g.myShare > 0 && !INVESTING_CATS.has(g.category)) add(g.category, g.myShare)
  }
  for (const tx of transactions) {
    if (tx.type !== 'transfer' || tx.category !== 'invest-move' || tx.amount >= 0) continue
    const divisor = personalDivisorFor(tx, userId, accounts)
    if (divisor !== Infinity) add('invest-move', Math.abs(tx.amount) / divisor)
  }
  return map
}
