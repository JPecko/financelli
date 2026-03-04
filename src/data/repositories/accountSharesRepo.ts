import { supabase } from '@/data/supabase'
import type { AccountShare } from '@/domain/types'

export const accountSharesRepo = {
  getForAccount: async (accountId: number): Promise<AccountShare[]> => {
    const { data: shares, error } = await supabase
      .from('account_shares')
      .select('shared_with_id')
      .eq('account_id', accountId)
    if (error) throw error
    if (!shares || shares.length === 0) return []

    const userIds = shares.map(s => s.shared_with_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)
    if (profilesError) throw profilesError

    const profileMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.id, p])
    )
    return userIds.map(uid => ({
      userId:   uid,
      email:    profileMap[uid]?.email ?? uid,
      fullName: profileMap[uid]?.full_name ?? undefined,
    }))
  },

  add: async (accountId: number, sharedWithId: string): Promise<void> => {
    const { error } = await supabase
      .from('account_shares')
      .insert({ account_id: accountId, shared_with_id: sharedWithId })
    if (error) throw error
  },

  remove: async (accountId: number, sharedWithId: string): Promise<void> => {
    const { error } = await supabase
      .from('account_shares')
      .delete()
      .eq('account_id', accountId)
      .eq('shared_with_id', sharedWithId)
    if (error) throw error
  },
}
