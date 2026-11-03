import { useMemo } from 'react'
import { useAccounts } from '@/shared/hooks/useAccounts'
import { useGroups } from '@/shared/hooks/useGroups'
import { useMobileNavStore } from '@/shared/store/mobileNavStore'
import { navItems, type NavItem } from '@/shared/config/nav'
import { splitMobileNav } from '@/shared/config/mobileNav'

const toItem = (to: string): NavItem => navItems.find(n => n.to === to)!

/** Mobile bottom-bar items in the user's order; Investments/Groups only appear once they have data. */
export function useMobileNavItems() {
  const order = useMobileNavStore(s => s.order)
  const { data: accounts = [] } = useAccounts()
  const { data: groups = [] }   = useGroups()
  const hasInvestments = accounts.some(a => a.type === 'investment')
  const hasGroups      = groups.length > 0

  return useMemo(() => {
    const isAvailable = (to: string) =>
      (to !== '/investments' || hasInvestments) && (to !== '/groups' || hasGroups)
    const { bar, more } = splitMobileNav(order, isAvailable)
    return { bar: bar.map(toItem), more: more.map(toItem), isAvailable }
  }, [order, hasInvestments, hasGroups])
}
