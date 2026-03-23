import { useNavigate } from 'react-router-dom'
import { Sun, Moon, LogOut, Settings, Languages } from 'lucide-react'
import { useThemeStore } from '@/shared/store/themeStore'
import { useLanguageStore } from '@/shared/store/languageStore'
import { useAuth } from '@/features/auth/AuthContext'
import { supabase } from '@/data/supabase'
import { APP_VERSION } from '@/version'
import { useT } from '@/shared/i18n'
import BrandLogo from '@/shared/components/BrandLogo'
import { hardRefreshApp } from '@/shared/utils/hardRefreshApp'
import { hasAppUpdate } from '@/shared/utils/checkForAppUpdate'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export default function MobileHeader() {
  const { theme, toggle } = useThemeStore()
  const { lang, setLang } = useLanguageStore()
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
        <BrandLogo variant="mark" className="h-8 w-8" />
        <span className="text-xl font-semibold text-white tracking-tight">Financelli</span>
        <span className="text-[10px] text-muted-foreground/60">{APP_VERSION}</span>
      </button>

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
