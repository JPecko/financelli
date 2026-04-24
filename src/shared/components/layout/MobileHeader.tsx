import { NavLink } from 'react-router-dom'
import { Sun, Moon, LogOut, Settings } from 'lucide-react'
import { useThemeStore } from '@/shared/store/themeStore'
import LanguageSelect from '@/shared/components/LanguageSelect'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { useT } from '@/shared/i18n'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import AppLogoButton from '@/shared/components/AppLogoButton'
import { getUserInitials } from '@/shared/utils/userInitials'

export default function MobileHeader() {
  const { theme, toggle } = useThemeStore()
  const { user } = useAuth()
  const t = useT()
  const initials = getUserInitials(user)

  return (
    <header className="relative z-20 overflow-visible lg:hidden flex items-center justify-between gap-3 border-b border-border px-4 py-2 safe-area-top-pad-3 bg-sidebar">
      <AppLogoButton height="h-8" showVersion forceDark />

      <div className="relative flex items-center gap-2">
        <LanguageSelect />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex h-9 w-9 items-center justify-center rounded-full transition-colors ${isActive ? 'text-primary' : 'text-sidebar-foreground hover:text-sidebar-primary-foreground hover:bg-sidebar-accent'}`
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
