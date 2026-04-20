import { supabase } from '@/data/supabase'
import type { Transaction } from '@/domain/types'
import { accountsRepo } from './accountsRepo'
import { holdingsRepo } from './holdingsRepo'

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
  is_personal: boolean
  split_n: number | null
  is_reimbursable: boolean
  personal_user_id: string | null
  holding_id: number | null
  units: number | null
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
    isPersonal:      row.is_personal ?? false,
    splitN:          row.split_n ?? null,
    isReimbursable:  row.is_reimbursable ?? false,
    personalUserId:  row.personal_user_id ?? undefined,
    holdingId:       row.holding_id ?? undefined,
    units:           row.units != null ? Number(row.units) : undefined,
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
    is_personal:       tx.isPersonal ?? false,
    split_n:           tx.splitN ?? null,
    is_reimbursable:   tx.isReimbursable ?? false,
    personal_user_id:  tx.personalUserId ?? null,
    holding_id:        tx.holdingId ?? null,
    units:             tx.units ?? null,
  }
}

async function applyBalances(tx: Omit<Transaction, 'id' | 'createdAt'>) {
  await accountsRepo.adjustBalance(tx.accountId, tx.amount)
  if (tx.toAccountId != null) {
    await accountsRepo.adjustBalance(tx.toAccountId, -tx.amount)
  }
}

/** Auto-creates cashback and/or roundup transactions for an expense, if the account has them enabled. */
async function createAutoTransactions(
  tx: Omit<Transaction, 'id' | 'createdAt'>,
  account: Awaited<ReturnType<typeof accountsRepo.getById>>,
): Promise<void> {
  if (!account) return

  const expAbs = Math.abs(tx.amount) // positive cents

  // ── Roundup ─────────────────────────────────────────────────────────────────
  if (account.roundupMultiplier) {
    const remainder = expAbs % 100                    // cents past the last whole euro
    const baseCents = remainder === 0 ? 100 : 100 - remainder  // gap to next euro (whole = 1€)
    if (baseCents > 0) {
      const roundupCents = baseCents * account.roundupMultiplier
      await supabase.from('transactions').insert({
        account_id:        tx.accountId,
        to_account_id:     null,
        amount:            -roundupCents,
        type:              'expense',
        category:          'roundup',
        description:       `${tx.description} - Roundup ×${account.roundupMultiplier}`,
        date:              tx.date,
        recurring_rule_id: null,
      })
      await accountsRepo.adjustBalance(tx.accountId, -roundupCents)
    }
  }
}

async function removeLinkedRoundup(tx: Transaction): Promise<void> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('account_id', tx.accountId)
    .eq('date', tx.date)
    .eq('category', 'roundup')
    .like('description', `${tx.description} - Roundup ×%`)
    .limit(1)
  if (error || !data?.length) return
  const roundup = toTransaction(data[0] as TransactionRow)
  await accountsRepo.adjustBalance(roundup.accountId, -roundup.amount)
  await supabase.from('transactions').delete().eq('id', roundup.id!)
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
      .order('created_at', { ascending: false })
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

    // Auto-generate cashback/roundup for expenses (excluding auto-transactions themselves)
    if (tx.type === 'expense' && tx.amount < 0 &&
        tx.category !== 'cashback' && tx.category !== 'roundup') {
      const account = await accountsRepo.getById(tx.accountId)
      await createAutoTransactions(tx, account)
    }

    // Update linked holding quantity/avgCost
    if (tx.holdingId) {
      await holdingsRepo.recalculate(tx.holdingId)
    }

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

    // Sync linked roundup when editing a source expense
    const isSourceExpense = (t: Transaction) =>
      t.type === 'expense' && t.amount < 0 && t.category !== 'cashback' && t.category !== 'roundup'

    if (isSourceExpense(existingTx)) {
      await removeLinkedRoundup(existingTx)
      if (isSourceExpense(updated)) {
        const account = await accountsRepo.getById(updated.accountId)
        await createAutoTransactions(updated, account)
      }
    }

    // Recalculate old and new holdings if holdingId changed
    const oldHoldingId = existingTx.holdingId
    const newHoldingId = updated.holdingId
    if (oldHoldingId && oldHoldingId !== newHoldingId) {
      await holdingsRepo.recalculate(oldHoldingId)
    }
    if (newHoldingId) {
      await holdingsRepo.recalculate(newHoldingId)
    }
  },

  recalculateAllRoundups: async (): Promise<{ removed: number; created: number }> => {
    // 1. Delete all existing roundup transactions and reverse their balances
    const { data: roundups, error: fetchErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('category', 'roundup')
    if (fetchErr) throw fetchErr

    for (const row of (roundups as TransactionRow[]) ?? []) {
      const roundup = toTransaction(row)
      await accountsRepo.adjustBalance(roundup.accountId, -roundup.amount)
      await supabase.from('transactions').delete().eq('id', roundup.id!)
    }

    // 2. Recreate roundups from all source expenses
    const { data: expenses, error: expErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', 'expense')
      .lt('amount', 0)
      .neq('category', 'cashback')
      .neq('category', 'roundup')
    if (expErr) throw expErr

    let created = 0
    for (const row of (expenses as TransactionRow[]) ?? []) {
      const tx = toTransaction(row)
      const account = await accountsRepo.getById(tx.accountId)
      if (!account?.roundupMultiplier) continue
      await createAutoTransactions(tx, account)
      created++
    }

    return { removed: roundups?.length ?? 0, created }
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

    // Remove orphaned roundup when source expense is deleted
    if (tx.type === 'expense' && tx.amount < 0 && tx.category !== 'cashback' && tx.category !== 'roundup') {
      await removeLinkedRoundup(tx)
    }

    // Recalculate holding after transaction removed
    if (tx.holdingId) {
      await holdingsRepo.recalculate(tx.holdingId)
    }
  },
}
