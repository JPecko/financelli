import { Wallet, LayoutDashboard, ArrowLeftRight, RefreshCw, Settings, Users, TrendingUp, Target, Flag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { TKey } from '@/shared/i18n'

export interface NavItem {
  to:       string
  labelKey: TKey
  icon:     LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/dashboard',    labelKey: 'nav.dashboard',    icon: LayoutDashboard },
  { to: '/accounts',     labelKey: 'nav.accounts',     icon: Wallet },
  { to: '/transactions', labelKey: 'nav.transactions', icon: ArrowLeftRight },
  { to: '/recurring',    labelKey: 'nav.recurring',    icon: RefreshCw },
  { to: '/budgets',      labelKey: 'nav.budgets',      icon: Target },
  { to: '/goals',        labelKey: 'nav.goals',        icon: Flag },
  { to: '/groups',       labelKey: 'nav.groups',       icon: Users },
  { to: '/investments',  labelKey: 'nav.investments',  icon: TrendingUp },
  { to: '/settings',     labelKey: 'nav.settings',     icon: Settings },
]
