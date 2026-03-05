import { supabase } from '@/data/supabase'

export interface ProfileResult {
  id: string
  email: string
  fullName?: string
}

export interface AccountPrefs {
  sort:        string
  manualOrder: number[]
  colorOrder:  string[]
}

export const profilesRepo = {
  search: async (query: string): Promise<ProfileResult[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(5)
    if (error) throw error
    return (data ?? []).map(row => ({
      id:       row.id,
      email:    row.email,
      fullName: row.full_name ?? undefined,
    }))
  },

  getPrefs: async (): Promise<AccountPrefs> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { sort: 'default', manualOrder: [], colorOrder: [] }
    const { data } = await supabase
      .from('profiles')
      .select('accounts_sort, accounts_manual_order, accounts_color_order')
      .eq('id', user.id)
      .single()
    return {
      sort:        data?.accounts_sort        ?? 'default',
      manualOrder: data?.accounts_manual_order ?? [],
      colorOrder:  data?.accounts_color_order  ?? [],
    }
  },

  savePrefs: async (prefs: Partial<AccountPrefs>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const updates: Record<string, unknown> = {}
    if (prefs.sort        !== undefined) updates.accounts_sort         = prefs.sort
    if (prefs.manualOrder !== undefined) updates.accounts_manual_order = prefs.manualOrder
    if (prefs.colorOrder  !== undefined) updates.accounts_color_order  = prefs.colorOrder
    await supabase.from('profiles').update(updates).eq('id', user.id)
  },

  getById: async (id: string): Promise<ProfileResult | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', id)
      .single()
    if (error) return null
    return {
      id:       data.id,
      email:    data.email,
      fullName: data.full_name ?? undefined,
    }
  },
}
