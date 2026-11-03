import { useMemo } from 'react'
import { useCategorySpending } from '@/shared/hooks/useCategorySpending'
import { shiftMonth, type YearMonth } from '@/domain/netWorth'

const now     = new Date()
const CURRENT = { year: now.getFullYear(), month: now.getMonth() + 1 }
const M1 = shiftMonth(CURRENT, -1)
const M2 = shiftMonth(CURRENT, -2)
const M3 = shiftMonth(CURRENT, -3)

const at = (ym: YearMonth) => [ym.year, ym.month] as const

/** Average monthly personal spending per category over the 3 full months before this one (cents). */
export function useCategoryAverages() {
  const a = useCategorySpending(...at(M1))
  const b = useCategorySpending(...at(M2))
  const c = useCategorySpending(...at(M3))

  return useMemo(() => {
    const result: Record<string, number> = {}
    for (const month of [a.spending, b.spending, c.spending]) {
      for (const [category, value] of Object.entries(month)) result[category] = (result[category] ?? 0) + value / 3
    }
    return result
  }, [a.spending, b.spending, c.spending])
}
