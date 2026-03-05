import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  RefreshCw,
  Settings,
  TrendingUp,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/shared/store/themeStore'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { Button } from '@/shared/components/ui/button'

const navItems = [
  { to: '/',             label: 'Dashboard',    icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/accounts',     label: 'Accounts',     icon: Wallet },
  { to: '/recurring',    label: 'Recurring',    icon: RefreshCw },
  { to: '/settings',     label: 'Settings',     icon: Settings },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { theme, toggle } = useThemeStore()
  const { user } = useAuth()
  const handleLogout = () => supabase.auth.signOut()

  const displayName = user?.user_metadata?.full_name as string | undefined
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen w-60 flex-col border-r border-border bg-sidebar',
        'transition-transform duration-300 ease-in-out',
        'lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Logo — safe-area-top-pad-5 ensures content clears the notch */}
      <div className="flex items-center gap-2 px-6 py-5 safe-area-top-pad-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">FinanceOS</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — safe-area-bottom-pad-3 clears the home indicator */}
      <div className="border-t border-sidebar-border px-3 py-3 safe-area-bottom-pad-3 space-y-2">
        {/* User info */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {initials}
          </div>
          <span className="truncate text-xs font-medium text-sidebar-foreground">
            {displayName ?? user?.email}
          </span>
        </div>
        {/* Actions */}
        <div className="flex items-center justify-between px-1">
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out" className="h-7 w-7">
            <LogOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-7 w-7">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  )
}
