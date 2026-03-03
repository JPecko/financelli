import { supabase } from '@/data/supabase'
import type { Account } from '@/domain/types'

type AccountRow = {
  id: number
  name: string
  type: string
  balance: number
  currency: string
  color: string
  created_at: string
}

function toAccount(row: AccountRow): Account {
  return {
    id:        row.id,
    name:      row.name,
    type:      row.type as Account['type'],
    balance:   row.balance,
    currency:  row.currency,
    color:     row.color,
    createdAt: row.created_at,
  }
}

export const accountsRepo = {
  getAll: async (): Promise<Account[]> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at')
    if (error) throw error
    return (data as AccountRow[]).map(toAccount)
  },

  getById: async (id: number): Promise<Account | undefined> => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return undefined
    return toAccount(data as AccountRow)
  },

  add: async (account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> => {
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        name:     account.name,
        type:     account.type,
        balance:  account.balance,
        currency: account.currency,
        color:    account.color,
      })
      .select()
      .single()
    if (error) throw error
    return toAccount(data as AccountRow)
  },

  update: async (id: number, changes: Partial<Account>): Promise<void> => {
    const row: Record<string, unknown> = {}
    if (changes.name     !== undefined) row.name     = changes.name
    if (changes.type     !== undefined) row.type     = changes.type
    if (changes.balance  !== undefined) row.balance  = changes.balance
    if (changes.currency !== undefined) row.currency = changes.currency
    if (changes.color    !== undefined) row.color    = changes.color
    const { error } = await supabase.from('accounts').update(row).eq('id', id)
    if (error) throw error
  },

  remove: async (id: number): Promise<void> => {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) throw error
  },

  /** Atomically adjusts the balance by delta cents (via RPC to avoid races) */
  adjustBalance: async (id: number, deltaCents: number): Promise<void> => {
    const { error } = await supabase.rpc('adjust_balance', { p_id: id, p_delta: deltaCents })
    if (error) throw error
  },
}
