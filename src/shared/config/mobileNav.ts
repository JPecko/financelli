// Routes the user can order in the mobile bottom bar (Settings lives in the mobile header)
export const MOBILE_NAV_DEFAULT_ORDER = [
  '/dashboard', '/transactions', '/accounts', '/groups', '/budgets', '/investments', '/recurring', '/goals',
]

// With more than this many items, the last bar slot becomes a "More" menu
export const MOBILE_NAV_MAX_SLOTS = 5

/** Keeps known routes in the saved order and appends any route added after the order was saved. */
export function normalizeMobileNavOrder(order: string[]): string[] {
  const known = order.filter(to => MOBILE_NAV_DEFAULT_ORDER.includes(to))
  return [...known, ...MOBILE_NAV_DEFAULT_ORDER.filter(to => !known.includes(to))]
}

/** Splits the available routes into the bar slots and the overflow shown under "More". */
export function splitMobileNav(order: string[], isAvailable: (to: string) => boolean) {
  const routes = normalizeMobileNavOrder(order).filter(isAvailable)
  if (routes.length <= MOBILE_NAV_MAX_SLOTS) return { bar: routes, more: [] as string[] }
  return { bar: routes.slice(0, MOBILE_NAV_MAX_SLOTS - 1), more: routes.slice(MOBILE_NAV_MAX_SLOTS - 1) }
}
