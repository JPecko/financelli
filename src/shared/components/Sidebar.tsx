import { useNavigate, NavLink } from 'react-router-dom'
import { TrendingUp, Sun, Moon, LogOut, Settings, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/shared/store/themeStore'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { navItems } from '@/shared/config/nav'
import { APP_VERSION } from '@/version'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export default function Sidebar() {
  const { theme, toggle } = useThemeStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const handleLogout = () => supabase.auth.signOut()

  const displayName = user?.user_metadata?.full_name as string | undefined
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <aside className="hidden lg:flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <TrendingUp className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">Financelli</span>
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{APP_VERSION}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end
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

      {/* Footer — avatar triggers profile menu */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors text-left cursor-pointer">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">{displayName ?? user?.email}</p>
                {displayName && <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem onClick={toggle}>
              {theme === 'dark'
                ? <Sun className="h-4 w-4 mr-2" />
                : <Moon className="h-4 w-4 mr-2" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Languages className="h-4 w-4 mr-2" />
              Language
              <span className="ml-auto text-xs text-muted-foreground">EN</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
