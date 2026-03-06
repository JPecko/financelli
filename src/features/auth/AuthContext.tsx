import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/data/supabase'
import { queryClient } from '@/app/queryClient'
import { useAccountPrefsStore } from '@/shared/store/accountPrefsStore'
import { autoApplyDueRules } from '@/shared/hooks/useRecurringRules'

// Reset on logout so the next login re-runs the auto-apply
let autoApplied = false

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        autoApplied = false
        queryClient.clear()
        useAccountPrefsStore.getState().reset()
      }
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session && !autoApplied) {
        autoApplied = true
        void autoApplyDueRules()
      }
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
