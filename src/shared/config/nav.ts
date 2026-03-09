import { Wallet, LayoutDashboard, ArrowLeftRight, RefreshCw, Settings } from 'lucide-react'
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
  { to: '/settings',     labelKey: 'nav.settings',     icon: Settings },
]
