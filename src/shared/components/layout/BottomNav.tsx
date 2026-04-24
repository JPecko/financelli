import { NavLink } from 'react-router-dom'
import { navItems } from '@/shared/config/nav'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useGroups } from '@/shared/hooks/useGroups'
import { useT } from '@/shared/i18n'

// ── Dynamic item resolution ───────────────────────────────────────────────────

const FIXED_ROUTES = ['/dashboard', '/transactions', '/accounts'] as const

/**
 * Resolves the two right-side slots of the mobile bottom nav:
 *
 *  both investments + groups → investments | groups
 *  only investments          → recurring   | investments
 *  only groups               → recurring   | groups
 *  neither                   → recurring   | settings
 */
function useDynamicRoutes(): [string, string] {
  const { data: accounts = [] } = useAccounts()
  const { data: groups = [] }   = useGroups()

  const hasInvestments = accounts.some(a => a.type === 'investment')
  const hasGroups      = groups.length > 0

  if (hasInvestments && hasGroups) return ['/investments', '/groups']
  if (hasInvestments)              return ['/recurring',   '/investments']
  if (hasGroups)                   return ['/recurring',   '/groups']
  return                                  ['/recurring',   '/settings']
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const t = useT()
  const [slot4, slot5] = useDynamicRoutes()

  const routes = [...FIXED_ROUTES, slot4, slot5]
  const items  = routes.map(to => navItems.find(n => n.to === to)!)

  return (
    <nav className="lg:hidden flex items-stretch border-t border-border bg-sidebar safe-area-bottom-pad-3">
      {items.map(({ to, labelKey, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end
          className="group/tab flex flex-1 flex-col items-center gap-1 pb-2 pt-3 transition-colors text-sidebar-foreground hover:text-sidebar-primary-foreground [&.active]:text-primary"
        >
          <span className="h-0.5 w-5 rounded-full bg-current opacity-0 group-[.active]/tab:opacity-100 transition-opacity" />
          <Icon className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">{t(labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
