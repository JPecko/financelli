import { Wallet, LayoutDashboard, ArrowLeftRight, RefreshCw, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/accounts',     label: 'Accounts',     icon: Wallet },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/recurring',    label: 'Recurring',    icon: RefreshCw },
  { to: '/settings',     label: 'Settings',     icon: Settings },
]
