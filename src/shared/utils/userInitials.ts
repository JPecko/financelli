import type { User } from '@supabase/supabase-js'

export function getUserInitials(user: User | null): string {
  const displayName = user?.user_metadata?.full_name as string | undefined
  if (displayName) {
    return displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  }
  return (user?.email?.[0] ?? '?').toUpperCase()
}
