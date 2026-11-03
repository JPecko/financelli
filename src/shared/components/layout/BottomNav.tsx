import { Link, NavLink, useLocation } from 'react-router-dom'
import { Ellipsis } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useMobileNavItems } from '@/shared/hooks/useMobileNavItems'
import { useT } from '@/shared/i18n'
import type { NavItem } from '@/shared/config/nav'

const TAB_CLASS =
  'group/tab flex flex-1 flex-col items-center gap-1 pb-2 pt-3 transition-colors text-sidebar-foreground hover:text-sidebar-primary-foreground [&.active]:text-primary'

export default function BottomNav() {
  const t = useT()
  const { bar, more } = useMobileNavItems()

  return (
    <nav className="lg:hidden flex items-stretch border-t border-border bg-sidebar safe-area-bottom-pad-3">
      {bar.map(({ to, labelKey, icon: Icon }) => (
        <NavLink key={to} to={to} end className={TAB_CLASS}>
          <TabContent icon={<Icon className="h-5 w-5" />} label={t(labelKey)} />
        </NavLink>
      ))}
      {more.length > 0 && <MoreTab items={more} />}
    </nav>
  )
}

// Last slot: opens the routes that don't fit in the bar; highlighted while one of them is open
function MoreTab({ items }: { items: NavItem[] }) {
  const t = useT()
  const { pathname } = useLocation()
  const isActive = items.some(item => pathname.startsWith(item.to))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`${TAB_CLASS} ${isActive ? 'active' : ''}`} aria-label={t('nav.more')}>
          <TabContent icon={<Ellipsis className="h-5 w-5" />} label={t('nav.more')} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-52">
        {items.map(({ to, labelKey, icon: Icon }) => (
          <DropdownMenuItem key={to} asChild className={pathname.startsWith(to) ? 'text-primary' : undefined}>
            <Link to={to} className="py-2.5"><Icon className="mr-2 h-4 w-4" />{t(labelKey)}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TabContent({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <>
      <span className="h-0.5 w-5 rounded-full bg-current opacity-0 group-[.active]/tab:opacity-100 transition-opacity" />
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </>
  )
}
