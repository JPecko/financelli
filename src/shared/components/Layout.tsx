import { useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { TrendingUp, Sun, Moon, LogOut } from 'lucide-react'
import Sidebar from './Sidebar'
import { Button } from '@/shared/components/ui/button'
import { useAccountPrefsStore } from '@/shared/store/accountPrefsStore'
import { useThemeStore } from '@/shared/store/themeStore'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { navItems } from '@/shared/config/nav'

const MOBILE_NAV_ORDER = ['/dashboard', '/transactions', '/accounts', '/recurring', '/settings']
const mobileNavItems = MOBILE_NAV_ORDER.map(to => navItems.find(n => n.to === to)!)

function BottomNav() {
  return (
    <nav className="lg:hidden flex items-stretch border-t border-border bg-sidebar safe-area-bottom-pad-3">
      {mobileNavItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className="group/tab flex flex-1 flex-col items-center gap-1 pb-2 pt-3 transition-colors text-muted-foreground hover:text-foreground [&.active]:text-primary"
        >
          {/* Indicator pill — visible when NavLink has the auto-added .active class */}
          <span className="h-0.5 w-5 rounded-full bg-current opacity-0 group-[.active]/tab:opacity-100 transition-opacity" />
          <Icon className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function MobileHeader() {
  const { theme, toggle } = useThemeStore()
  const { user } = useAuth()

  const displayName = user?.user_metadata?.full_name as string | undefined
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header className="lg:hidden flex items-center justify-between gap-3 border-b border-border px-4 py-3 safe-area-top-pad-3 bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
          <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">FinanceOS</span>
      </div>
      {/* User + theme actions */}
      <div className="flex items-center gap-1">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {initials}
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme" className="h-7 w-7">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => supabase.auth.signOut()} aria-label="Sign out" className="h-7 w-7">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

export default function Layout() {
  const load = useAccountPrefsStore(s => s.load)
  useEffect(() => { void load() }, [load])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileHeader />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
