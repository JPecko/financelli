import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { TrendingUp, Sun, Moon, LogOut, Settings, Languages } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAccountPrefsStore } from '@/shared/store/accountPrefsStore'
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

const MOBILE_NAV_ORDER = ['/dashboard', '/transactions', '/accounts', '/recurring', '/settings']
const mobileNavItems = MOBILE_NAV_ORDER.map(to => navItems.find(n => n.to === to)!)

function BottomNav() {
  const t = useT()
  return (
    <nav className="lg:hidden flex items-stretch border-t border-border bg-sidebar safe-area-bottom-pad-3">
      {mobileNavItems.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className="group/tab flex flex-1 flex-col items-center gap-1 pb-2 pt-3 transition-colors text-muted-foreground hover:text-foreground [&.active]:text-primary"
        >
          <span className="h-0.5 w-5 rounded-full bg-current opacity-0 group-[.active]/tab:opacity-100 transition-opacity" />
          <Icon className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}

function MobileHeader() {
  const { theme, toggle } = useThemeStore()
  const { lang, setLang } = useLanguageStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const t = useT()

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
        <span className="text-sm font-semibold text-sidebar-foreground">Financelli</span>
        <span className="text-[10px] text-muted-foreground/60">{APP_VERSION}</span>
      </div>
      {/* Avatar — opens profile menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity">
            {initials}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-52">
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
          <DropdownMenuItem onClick={() => supabase.auth.signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            {t('sidebar.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
