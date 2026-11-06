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

export type PersonalExpenseItem = {
  key: string; description: string; category: string; date: string
  amount: number  // cents, negative: the user's own share
  sublabel?: string
}

/** Each expense as the user's own share: bank transactions plus group entries (investing excluded). */
export function personalExpenseItems({
  transactions, groupExpenses, accounts, userId,
}: Omit<SpendingInputs, 'sharedExpenses'>): PersonalExpenseItem[] {
  return [
    ...transactions
      .filter(tx => isCashFlow(tx) && tx.amount < 0 && personalDivisorFor(tx, userId, accounts) !== Infinity)
      .map(tx => ({
        key: `tx-${tx.id}`, description: tx.description, category: tx.category, date: tx.date,
        amount: Math.round(tx.amount / personalDivisorFor(tx, userId, accounts)),
      })),
    ...groupExpenses
      .filter(g => g.myShare > 0 && !INVESTING_CATS.has(g.category))
      .map(g => ({
        key: `grp-${g.entryId}`, description: g.description, category: g.category, date: g.date,
        amount: -g.myShare, sublabel: g.groupName,
      })),
  ]
}
