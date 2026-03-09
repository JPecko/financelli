import { useNavigate, NavLink } from 'react-router-dom'
import { Sun, Moon, LogOut, Settings, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/shared/store/themeStore'
import { useLanguageStore } from '@/shared/store/languageStore'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { navItems } from '@/shared/config/nav'
import { APP_VERSION } from '@/version'
import { useT } from '@/shared/i18n'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import BrandLogo from '@/shared/components/BrandLogo'

export default function Sidebar() {
  const { theme, toggle } = useThemeStore()
  const { lang, setLang } = useLanguageStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const handleLogout = () => supabase.auth.signOut()

  const displayName = user?.user_metadata?.full_name as string | undefined
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <aside className="hidden lg:flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-sidebar-border">
        <BrandLogo variant="wordmark" className="h-7 text-sidebar-foreground" />
        <span className="text-[10px] text-muted-foreground/60 ml-auto">{APP_VERSION}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ to, labelKey, icon: Icon }) => (
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
                {t(labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer — theme/language quick actions + avatar menu */}
      <div className="border-t border-sidebar-border px-3 py-3 space-y-1">
        {/* Quick actions */}
        <div className="flex items-center gap-1 px-2 pb-1">
          <button
            onClick={toggle}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            aria-label={t(theme === 'dark' ? 'sidebar.themeLight' : 'sidebar.themeDark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
            className="flex h-7 items-center gap-1 px-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
            aria-label={t('sidebar.language')}
          >
            <Languages className="h-3.5 w-3.5" />
            {lang.toUpperCase()}
          </button>
        </div>

        {/* Avatar — opens profile menu */}
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
              {t(theme === 'dark' ? 'sidebar.themeLight' : 'sidebar.themeDark')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}>
              <Languages className="h-4 w-4 mr-2" />
              {t('sidebar.language')}
              <span className="ml-auto text-xs text-muted-foreground">{lang.toUpperCase()}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('sidebar.settings')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              {t('sidebar.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
