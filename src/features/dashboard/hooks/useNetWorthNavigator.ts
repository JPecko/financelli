import { useMemo, useState } from 'react'
import { differenceInCalendarMonths, format, parseISO } from 'date-fns'
import { useLanguageStore } from '@/shared/store/languageStore'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import { groupBalancesByType, sumBalances, type NetWorthMonth } from '@/domain/netWorth'
import { useNetWorthHistory } from '@/shared/hooks/useNetWorthHistory'
import type { Account } from '@/domain/types'

const MAX_MONTHS_BACK = 12

const now   = new Date()
const today = { year: now.getFullYear(), month: now.getMonth() + 1 }

function monthsSinceFirstAccount(accounts: Account[]) {
  const dates = accounts.map(a => a.createdAt).filter(Boolean).sort()
  if (dates.length === 0) return 0
  return Math.max(differenceInCalendarMonths(now, parseISO(dates[0])), 0)
}

/** Net Worth card state: month navigation, balances for the selected month and growth vs the previous one. */
export function useNetWorthNavigator(accounts: Account[], liveBalances: Record<number, number>) {
  const locale = getDateFnsLocale(useLanguageStore(s => s.lang))
  const [offset, setOffset] = useState(0)
  // current month + 12 back + one extra so the oldest navigable month still has a comparison
  const { months } = useNetWorthHistory(accounts, liveBalances, today, MAX_MONTHS_BACK + 2)

  const maxOffset = Math.min(MAX_MONTHS_BACK, monthsSinceFirstAccount(accounts))
  const index     = months.length - 1 - offset

  const selected = useMemo<NetWorthMonth>(() => (
    months[index] ?? { ...today, balances: liveBalances, total: sumBalances(liveBalances), missingInvestments: false, estimatedInvestments: false }
  ), [months, index, liveBalances])
  const previous = months[index - 1]

  const byType        = useMemo(() => groupBalancesByType(accounts, selected.balances), [accounts, selected])
  const positiveTotal = byType.filter(([, v]) => v > 0).reduce((s, [, v]) => s + v, 0)
  const delta         = previous ? selected.total - previous.total : null
  const deltaPct      = delta != null && previous && previous.total !== 0
    ? Math.round((delta / Math.abs(previous.total)) * 1000) / 10 : null

  return {
    label:       format(new Date(selected.year, selected.month - 1, 1), 'MMMM yyyy', { locale }),
    isCurrent:   offset === 0,
    total:       selected.total,
    byType,
    positiveTotal,
    delta,
    deltaPct,
    missingInvestments:   selected.missingInvestments,
    estimatedInvestments: selected.estimatedInvestments,
    canGoBack:    offset < maxOffset && months.length > 0,
    canGoForward: offset > 0,
    goBack:    () => setOffset(o => Math.min(o + 1, maxOffset)),
    goForward: () => setOffset(o => Math.max(o - 1, 0)),
  }
}
