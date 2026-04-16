import { useNavigate, NavLink } from 'react-router-dom' // useNavigate kept for handleLogoClick
import { Sun, Moon, LogOut, Settings } from 'lucide-react'
import { useThemeStore } from '@/shared/store/themeStore'
import LanguageSelect from '@/shared/components/LanguageSelect'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { APP_VERSION } from '@/version'
import { useT } from '@/shared/i18n'
import { hardRefreshApp } from '@/shared/utils/hardRefreshApp'
import { hasAppUpdate } from '@/shared/utils/checkForAppUpdate'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export default function MobileHeader() {
  const { theme, toggle } = useThemeStore()
  const { user } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const handleLogoClick = async () => {
    if (await hasAppUpdate()) {
      await hardRefreshApp()
      return
    }
    navigate('/dashboard')
  }

  const displayName = user?.user_metadata?.full_name as string | undefined
  const initials = displayName
    ? displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header className="lg:hidden flex items-center justify-between gap-3 border-b border-border px-4 py-2 safe-area-top-pad-3 bg-sidebar">
      <button
        type="button"
        onClick={() => { void handleLogoClick() }}
        className="flex items-center gap-1 cursor-pointer"
        aria-label="Check app updates"
        title="Check app updates"
      >
        <img src="/financelli-logo-light.svg" alt="Financelli" className="h-8 dark:hidden" />
        <img src="/financelli-logo-dark.svg" alt="Financelli" className="h-8 hidden dark:block" />
        <span className="text-[10px] text-muted-foreground/60">{APP_VERSION}</span>
      </button>

      <div className="flex items-center gap-2">
        <LanguageSelect />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex h-9 w-9 items-center justify-center rounded-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`
          }
          aria-label={t('sidebar.settings')}
        >
          <Settings className="h-5 w-5" />
        </NavLink>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold cursor-pointer hover:opacity-90 transition-opacity">
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => supabase.auth.signOut()} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            {t('sidebar.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  )
}
