import { useMemo, useState } from 'react'
import { addDays, format, formatISO, isToday, isTomorrow, parseISO } from 'date-fns'
import { useRecurringRules } from '@/shared/hooks/useRecurringRules'
import { useT } from '@/shared/i18n'
import { useLanguageStore } from '@/shared/store/languageStore'
import { getDateFnsLocale } from '@/shared/utils/dateLocale'
import { buildUpcomingPayments, findBalanceAlerts } from '@/domain/upcomingPayments'
import type { Account } from '@/domain/types'

export const UPCOMING_WINDOWS = [7, 30] as const
export type UpcomingWindow = typeof UPCOMING_WINDOWS[number]

const iso = (d: Date) => formatISO(d, { representation: 'date' })

/** Recurring firings in the next N days plus accounts that would dip below zero because of them. */
export function useUpcomingPayments(accounts: Account[], balances: Record<number, number>) {
  const t = useT()
  const locale = getDateFnsLocale(useLanguageStore(s => s.lang))
  const { data: rules = [], isLoading } = useRecurringRules()
  const [days, setDays] = useState<UpcomingWindow>(7)

  const model = useMemo(() => {
    const today = new Date()
    const items  = buildUpcomingPayments(rules, iso(today), iso(addDays(today, days)))
    const alerts = findBalanceAlerts(items, accounts, balances)
    const totalOut = items.filter(i => i.amount < 0 && i.toAccountId == null).reduce((s, i) => s + i.amount, 0)
    // First firing after the window, so an empty week still says when the next one is
    const nextLater = items.length === 0 ? buildUpcomingPayments(rules, iso(today), iso(addDays(today, 366)))[0] : undefined
    return { items, alerts, totalOut, nextLater }
  }, [rules, accounts, balances, days])

  const dateLabel = (date: string) => {
    const d = parseISO(date)
    if (isToday(d))    return t('dashboard.upcoming.today')
    if (isTomorrow(d)) return t('dashboard.upcoming.tomorrow')
    return format(d, 'EEE d MMM', { locale })
  }

  return {
    ...model,
    hasRules: rules.some(r => r.active),
    isLoading,
    days, setDays,
    dateLabel,
    accountName: (id: number) => accounts.find(a => a.id === id)?.name ?? '?',
  }
}
