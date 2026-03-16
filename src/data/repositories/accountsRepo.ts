import { supabase } from '@/data/supabase'
import type { Account } from '@/domain/types'

type AccountRow = {
  id: number
  user_id: string
  name: string
  type: string
  balance: number
  currency: string
  color: string
  created_at: string
  participants: number
  bank_code: string | null
  cashback_pct: number | null
  roundup_multiplier: number | null
  invested_base: number | null
  entry_fee: number | null
}

function toAccount(row: AccountRow): Account {
  return {
    id:                row.id,
    ownerId:           row.user_id,
    name:              row.name,
    type:              row.type as Account['type'],
    balance:           row.balance,
    currency:          row.currency,
    color:             row.color,
    createdAt:         row.created_at,
    participants:      row.participants ?? 1,
    sharedWith:        [],
    bankCode:          row.bank_code ?? undefined,
    cashbackPct:       row.cashback_pct ?? undefined,
    roundupMultiplier: row.roundup_multiplier ?? undefined,
    investedBase:      row.invested_base ?? undefined,
    entryFee:          row.entry_fee ?? undefined,
  }
}

export const accountsRepo = {
  getAll: async (): Promise<Account[]> => {
    // 1. Fetch accounts
    const { data: accountRows, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at')
    if (error) throw error
    const accounts = (accountRows as AccountRow[]).map(toAccount)
    if (accounts.length === 0) return accounts

    const accountIds = accounts.map(a => a.id!)

    // 2. Fetch all shares for these accounts
    const { data: shares } = await supabase
      .from('account_shares')
      .select('account_id, shared_with_id')
      .in('account_id', accountIds)

    if (!shares || shares.length === 0) return accounts

    // 3. Fetch profiles for all relevant users (shared + owners)
    const sharedUserIds = [...new Set(shares.map(s => s.shared_with_id))]
    const ownerIds      = [...new Set(accounts.map(a => a.ownerId).filter(Boolean) as string[])]
    const userIds       = [...new Set([...sharedUserIds, ...ownerIds])]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    const profileMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, p])
    )

    // 4. Merge sharedWith into each account
    const sharesByAccount: Record<number, typeof shares> = {}
    for (const share of shares) {
      if (!sharesByAccount[share.account_id]) sharesByAccount[share.account_id] = []
      sharesByAccount[share.account_id].push(share)
    }

    return accounts.map(account => {
      const accountShares = sharesByAccount[account.id!] ?? []
      const ownerProf     = account.ownerId ? profileMap[account.ownerId] : undefined
      return {
        ...account,
        ownerEmail:    ownerProf?.email ?? undefined,
        ownerFullName: ownerProf?.full_name ?? undefined,
        sharedWith: accountShares.map(s => ({
          userId:   s.shared_with_id,
          email:    profileMap[s.shared_with_id]?.email ?? s.shared_with_id,
          fullName: profileMap[s.shared_with_id]?.full_name ?? undefined,
        })),
      }
    })
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
        name:               account.name,
        type:               account.type,
        balance:            account.balance,
        currency:           account.currency,
        color:              account.color,
        bank_code:          account.bankCode ?? null,
        cashback_pct:       account.cashbackPct ?? null,
        roundup_multiplier: account.roundupMultiplier ?? null,
        invested_base:      account.investedBase ?? null,
        entry_fee:          account.entryFee ?? null,
      })
      .select()
      .single()
    if (error) throw error
    return toAccount(data as AccountRow)
  },

  update: async (id: number, changes: Partial<Account>): Promise<void> => {
    const row: Record<string, unknown> = {}
    if (changes.name              !== undefined) row.name               = changes.name
    if (changes.type              !== undefined) row.type               = changes.type
    if (changes.balance           !== undefined) row.balance            = changes.balance
    if (changes.currency          !== undefined) row.currency           = changes.currency
    if (changes.color             !== undefined) row.color              = changes.color
    if (changes.bankCode          !== undefined) row.bank_code          = changes.bankCode ?? null
    if (changes.cashbackPct       !== undefined) row.cashback_pct       = changes.cashbackPct ?? null
    if (changes.roundupMultiplier !== undefined) row.roundup_multiplier = changes.roundupMultiplier ?? null
    if (changes.investedBase      !== undefined) row.invested_base      = changes.investedBase ?? null
    if (changes.entryFee          !== undefined) row.entry_fee          = changes.entryFee ?? null
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
