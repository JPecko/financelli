import { supabase } from '@/data/supabase'

export const dismissedSubscriptionsRepo = {
  getKeys: async (): Promise<string[]> => {
    const { data, error } = await supabase.from('dismissed_subscriptions').select('key')
    if (error) throw error
    return (data as { key: string }[]).map(r => r.key)
  },

  add: async (key: string): Promise<void> => {
    const { error } = await supabase
      .from('dismissed_subscriptions')
      .upsert({ key }, { onConflict: 'user_id,key', ignoreDuplicates: true })
    if (error) throw error
  },
}
