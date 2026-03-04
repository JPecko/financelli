import { supabase } from '@/data/supabase'

export interface ProfileResult {
  id: string
  email: string
  fullName?: string
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
