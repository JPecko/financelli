import { supabase } from '@/data/supabase'
import type { Transaction } from '@/domain/types'
import { accountsRepo } from './accountsRepo'

type TransactionRow = {
  id: number
  account_id: number
  to_account_id: number | null
  amount: number
  type: string
  category: string
  description: string
  date: string
  recurring_rule_id: number | null
  created_at: string
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id:              row.id,
    accountId:       row.account_id,
    toAccountId:     row.to_account_id ?? undefined,
    amount:          row.amount,
    type:            row.type as Transaction['type'],
    category:        row.category,
    description:     row.description,
    date:            row.date,
    recurringRuleId: row.recurring_rule_id ?? undefined,
    createdAt:       row.created_at,
  }
}

function toRow(tx: Omit<Transaction, 'id' | 'createdAt'>): Record<string, unknown> {
  return {
    account_id:        tx.accountId,
    to_account_id:     tx.toAccountId ?? null,
    amount:            tx.amount,
    type:              tx.type,
    category:          tx.category,
    description:       tx.description,
    date:              tx.date,
    recurring_rule_id: tx.recurringRuleId ?? null,
  }
}

async function applyBalances(tx: Omit<Transaction, 'id' | 'createdAt'>) {
  await accountsRepo.adjustBalance(tx.accountId, tx.amount)
  if (tx.toAccountId != null) {
    await accountsRepo.adjustBalance(tx.toAccountId, -tx.amount)
  }
}

async function reverseBalances(tx: Transaction) {
  await accountsRepo.adjustBalance(tx.accountId, -tx.amount)
  if (tx.toAccountId != null) {
    await accountsRepo.adjustBalance(tx.toAccountId, tx.amount)
  }
}

export const transactionsRepo = {
  getAll: async (): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
    if (error) throw error
    return (data as TransactionRow[]).map(toTransaction)
  },

  getByMonth: async (year: number, month: number): Promise<Transaction[]> => {
    const from    = `${year}-${String(month).padStart(2, '0')}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear  = month === 12 ? year + 1 : year
    const to      = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', from)
      .lt('date', to)
      .order('date', { ascending: false })
    if (error) throw error
    return (data as TransactionRow[]).map(toTransaction)
  },

  getByAccount: async (accountId: number): Promise<Transaction[]> => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
    if (error) throw error
    return (data as TransactionRow[]).map(toTransaction)
  },

  add: async (tx: Omit<Transaction, 'id' | 'createdAt'>): Promise<number> => {
    const { data, error } = await supabase
      .from('transactions')
      .insert(toRow(tx))
      .select('id')
      .single()
    if (error) throw error
    await applyBalances(tx)
    return (data as { id: number }).id
  },

  update: async (id: number, changes: Partial<Transaction>): Promise<void> => {
    const { data: existing, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError
    const existingTx = toTransaction(existing as TransactionRow)
    await reverseBalances(existingTx)
    const updated = { ...existingTx, ...changes }
    const { error } = await supabase.from('transactions').update(toRow(updated)).eq('id', id)
    if (error) throw error
    await applyBalances(updated)
  },

  remove: async (id: number): Promise<void> => {
    const { data: existing, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchError) throw fetchError
    const tx = toTransaction(existing as TransactionRow)
    await reverseBalances(tx)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) throw error
  },
}
